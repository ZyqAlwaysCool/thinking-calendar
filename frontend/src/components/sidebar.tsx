'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, FileText, History, LayoutDashboard, Menu, Settings } from 'lucide-react'
import { NAV_LABELS, PAGE_TEXT } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog'

const navItems = [
  { href: '/today', label: NAV_LABELS.today, icon: CalendarDays },
  { href: '/history', label: NAV_LABELS.history, icon: History },
  { href: '/dashboard', label: NAV_LABELS.dashboard, icon: LayoutDashboard },
  { href: '/reports', label: NAV_LABELS.reports, icon: FileText },
  { href: '/settings', label: NAV_LABELS.settings, icon: Settings }
]

const DesktopSidebar = () => {
  const pathname = usePathname()
  return (
    <aside
      className="fixed left-0 top-0 hidden h-screen flex-col border-r border-gray-200 bg-gray-100 px-6 py-8 dark:border-gray-800 dark:bg-gray-900 lg:flex"
      style={{ width: 280 }}
    >
      <div className="pb-8 text-2xl font-bold text-gray-900 dark:text-gray-50">{NAV_LABELS.brand}</div>
      <nav className="flex-1 space-y-2">
        {navItems.map(item => {
          const active = pathname === item.href
          const Icon = item.icon
          return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 hover:scale-[1.02] hover:bg-gray-200 dark:hover:bg-gray-800',
              active
                ? 'bg-gray-900 text-gray-50 dark:bg-gray-100 dark:text-gray-900'
                : 'text-gray-700 dark:text-gray-200'
            )}
          >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

const MobileSidebar = () => {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  return (
    <div className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 bg-gray-100 px-4 py-3 dark:border-gray-800 dark:bg-gray-900 lg:hidden">
      <div className="text-xl font-bold text-gray-900 dark:text-gray-50">{NAV_LABELS.brand}</div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Menu className="h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="left-0 top-0 h-full max-w-xs translate-x-0 translate-y-0 rounded-none p-0">
          <div className="h-full space-y-4 bg-gray-100 p-6 dark:bg-gray-900" style={{ width: 280 }}>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-50">{NAV_LABELS.brand}</div>
            <nav className="space-y-2">
              {navItems.map(item => {
                const active = pathname === item.href
                const Icon = item.icon
                return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 hover:scale-[1.02] hover:bg-gray-200 dark:hover:bg-gray-800',
              active
                ? 'bg-gray-900 text-gray-50 dark:bg-gray-100 dark:text-gray-900'
                : 'text-gray-700 dark:text-gray-200'
            )}
          >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const Sidebar = () => {
  return (
    <>
      <MobileSidebar />
      <DesktopSidebar />
    </>
  )
}
