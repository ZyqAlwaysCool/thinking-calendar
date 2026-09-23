'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { type AutoSaveStatus } from '@/types'

type AutoSaveOptions = {
  value: string
  savedValue: string
  enabled: boolean
  onSave: (value: string) => Promise<void>
  canSave?: (value: string) => boolean
  delay?: number
}

export const useAutoSave = ({
  value,
  savedValue,
  enabled,
  onSave,
  canSave,
  delay = 1500
}: AutoSaveOptions) => {
  const [status, setStatus] = useState<AutoSaveStatus>('saved')
  const valueRef = useRef(value)
  const savedRef = useRef(savedValue)
  const saveRef = useRef(onSave)
  const enabledRef = useRef(enabled)
  const canSaveRef = useRef(canSave)
  const runningRef = useRef<Promise<boolean> | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  valueRef.current = value
  saveRef.current = onSave
  enabledRef.current = enabled
  canSaveRef.current = canSave

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const saveNow = useCallback(async (): Promise<boolean> => {
    clearTimer()
    if (!enabledRef.current || valueRef.current === savedRef.current) return true
    if (canSaveRef.current && !canSaveRef.current(valueRef.current)) {
      setStatus('empty')
      return false
    }
    if (runningRef.current) {
      await runningRef.current
      if (valueRef.current === savedRef.current) return true
    }
    const snapshot = valueRef.current
    const request = (async () => {
      setStatus('saving')
      try {
        await saveRef.current(snapshot)
        savedRef.current = snapshot
        setStatus(valueRef.current === snapshot ? 'saved' : 'pending')
        return true
      } catch {
        setStatus('error')
        return false
      }
    })()
    runningRef.current = request
    const success = await request
    if (runningRef.current === request) runningRef.current = null
    if (success && valueRef.current !== savedRef.current) {
      timerRef.current = setTimeout(() => { void saveNow() }, delay)
    }
    return success
  }, [clearTimer, delay])

  useEffect(() => {
    if (value === savedValue) {
      savedRef.current = savedValue
      if (!runningRef.current) setStatus('saved')
    }
  }, [value, savedValue])

  useEffect(() => {
    clearTimer()
    if (!enabled) return
    if (value === savedRef.current) {
      if (!runningRef.current) setStatus('saved')
      return
    }
    if (canSaveRef.current && !canSaveRef.current(value)) {
      setStatus('empty')
      return
    }
    setStatus('pending')
    timerRef.current = setTimeout(() => { void saveNow() }, delay)
    return clearTimer
  }, [value, enabled, delay, saveNow, clearTimer])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!enabledRef.current || valueRef.current === savedRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      clearTimer()
      if (enabledRef.current && valueRef.current !== savedRef.current) {
        void saveNow()
      }
    }
  }, [clearTimer, saveNow])

  return { status, saveNow }
}
