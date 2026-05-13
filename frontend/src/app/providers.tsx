'use client'

import { ReactNode, useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'

const DARK_MODE_KEY = 'tc_dark_mode'

type Props = {
  children: ReactNode
}

const applyDarkMode = (enabled: boolean) => {
  const root = document.documentElement
  if (enabled) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

const getInitialDarkMode = (): boolean => {
  if (typeof window === 'undefined') return false
  const stored = localStorage.getItem(DARK_MODE_KEY)
  if (stored !== null) return stored === 'true'
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const useDarkMode = () => {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(getInitialDarkMode())
  }, [])

  useEffect(() => {
    applyDarkMode(dark)
  }, [dark])

  const toggle = () => {
    setDark(prev => {
      const next = !prev
      localStorage.setItem(DARK_MODE_KEY, String(next))
      return next
    })
  }

  return { dark, toggle }
}

export const Providers = ({ children }: Props) => {
  useEffect(() => {
    applyDarkMode(getInitialDarkMode())
  }, [])

  return (
    <>
      {children}
      <Toaster position="top-center" />
    </>
  )
}
