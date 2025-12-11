'use client'

import { ReactNode, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from './sidebar'
import { useAuthStore } from '@/stores/use-auth-store'
import { PAGE_TEXT } from '@/lib/constants'
import { cn } from '@/lib/utils'

type Props = {
  children: ReactNode
}

const UserMenu = () => {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [open, setOpen] = useState(false)
  const name = user?.name || PAGE_TEXT.userMenuGuest
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
        className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-gray-50 transition-all duration-200 hover:scale-[1.02] dark:bg-gray-100 dark:text-gray-900"
        onClick={() => setOpen(!open)}
      >
        {short}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-gray-200 bg-gray-100 p-3 text-sm shadow-card dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 pb-2 text-gray-800 dark:border-gray-800 dark:text-gray-100">{name}</div>
          <button
            type="button"
            className={cn(
              'mt-2 w-full rounded-lg px-3 py-2 text-left text-gray-800 transition-all duration-200 hover:scale-[1.02] hover:bg-gray-200 dark:text-gray-100 dark:hover:bg-gray-800'
            )}
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
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
    <Sidebar />
    <main className="mx-auto max-w-[1400px] p-6 lg:ml-[280px] lg:p-8">
      <div className="mb-6 flex justify-end">
        <UserMenu />
      </div>
      {children}
    </main>
  </div>
)
