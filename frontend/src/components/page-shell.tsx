'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from './sidebar'
import { useAuthStore } from '@/stores/use-auth-store'
import { PAGE_TEXT } from '@/lib/constants'
import { toast } from 'react-hot-toast'

type Props = {
  children: ReactNode
}

const UserMenu = () => {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [open, setOpen] = useState(false)
  const name = user?.username || PAGE_TEXT.userMenuGuest
  const short = name.slice(0, 1).toUpperCase()

  const handleLogout = () => {
    logout()
    setOpen(false)
    router.push('/')
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={name}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-800 transition-colors duration-150 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900"
        onClick={() => setOpen(current => !current)}
      >
        {short}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-gray-200 bg-white p-2 text-sm shadow-lg dark:border-gray-800 dark:bg-gray-950">
          <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{name}</div>
          <button
            type="button"
            className="w-full rounded-md px-3 py-2 text-left text-gray-700 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-200 dark:hover:bg-gray-900 dark:hover:text-gray-50"
            onClick={handleLogout}
          >
            {PAGE_TEXT.userMenuLogout}
          </button>
        </div>
      )}
    </div>
  )
}

export const PageShell = ({ children }: Props) => (
  <ProtectedShell>{children}</ProtectedShell>
)

const ProtectedShell = ({ children }: Props) => {
  const router = useRouter()
  const { user, initializing, restoreSession, logout, refreshAccessToken, refreshToken } = useAuthStore()

  useEffect(() => {
    void restoreSession()
  }, [restoreSession])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => {
      if (!refreshToken) {
        logout()
        router.replace('/')
        return
      }
      void refreshAccessToken()
    }
    window.addEventListener('auth:unauthorized', handler)
    return () => window.removeEventListener('auth:unauthorized', handler)
  }, [logout, router, refreshAccessToken, refreshToken])

  useEffect(() => {
    if (!initializing && !user) {
      toast.error(PAGE_TEXT.loginAuthRequired)
      router.replace('/')
    }
  }, [user, router, initializing])

  if (initializing || !user) return null

  return (
    <div className="min-h-screen bg-gray-50/70 dark:bg-gray-950">
      <Sidebar />
      <main className="w-full lg:pl-[240px]">
        <div className="mx-auto w-full max-w-[1440px] px-5 py-5 sm:px-7 lg:px-10 lg:py-8">
          <div className="mb-6 flex justify-end">
            <UserMenu />
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
