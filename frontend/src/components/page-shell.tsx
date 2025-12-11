'use client'

import { ReactNode } from 'react'
import { Sidebar } from './sidebar'

type Props = {
  children: ReactNode
}

export const PageShell = ({ children }: Props) => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
    <Sidebar />
    <main className="mx-auto max-w-[1400px] p-6 lg:ml-[280px] lg:p-8">{children}</main>
  </div>
)
