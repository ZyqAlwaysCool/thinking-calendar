'use client'

import { useEffect } from 'react'

export const MswProvider = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const shouldMock = process.env.NEXT_PUBLIC_API_MOCKING !== 'disabled'
    if (!shouldMock) return
    const start = async () => {
      const { worker } = await import('@/mock/browser')
      await worker.start({
        onUnhandledRequest: 'bypass'
      })
    }
    void start()
  }, [])
  return null
}
