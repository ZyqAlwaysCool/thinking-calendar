'use client'

import { ReactNode, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { MswProvider } from '@/components/msw-provider'

type Props = {
  children: ReactNode
}

export const Providers = ({ children }: Props) => {
  useEffect(() => {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const root = document.documentElement
    if (prefersDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [])

  return (
    <>
      <MswProvider />
      {children}
      <Toaster position="top-right" />
    </>
  )
}
