'use client'

import { useEffect } from 'react'
import { setMockReady } from '@/mock/wait-mock'

export const MswProvider = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const shouldMock = process.env.NEXT_PUBLIC_API_MOCKING !== 'disabled'
    if (!shouldMock) return
    const start = async () => {
      const { worker } = await import('@/mock/browser')
      const promise = worker.start({
        onUnhandledRequest: 'bypass'
      })
      setMockReady(promise)
      await promise
    }
    void start()
  }, [])
  return null
}
