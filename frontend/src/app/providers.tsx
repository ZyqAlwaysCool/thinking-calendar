'use client'

import { ReactNode, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'

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
      {children}
      <Toaster position="top-center" />
    </>
  )
}
