'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, ClipboardCheck, FileText, History, LayoutDashboard, Settings } from 'lucide-react'
import { Menu, X, Moon, Sun } from 'lucide'
import { MorphIcon } from 'morphicons/react'
import { NAV_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useDarkMode } from '@/app/providers'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog'

const navItems = [
  { href: '/today', label: NAV_LABELS.today, icon: CalendarDays },
  { href: '/attendance', label: NAV_LABELS.attendance, icon: ClipboardCheck },
  { href: '/history', label: NAV_LABELS.history, icon: History },
  { href: '/dashboard', label: NAV_LABELS.dashboard, icon: LayoutDashboard },
  { href: '/reports', label: NAV_LABELS.reports, icon: FileText },
  { href: '/settings', label: NAV_LABELS.settings, icon: Settings }
]

const DesktopSidebar = () => {
  const pathname = usePathname()
  const { dark, toggle } = useDarkMode()
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
              'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 hover:scale-105 hover:bg-gray-200 dark:hover:bg-gray-800',
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
      <Button
        variant="ghost"
        size="sm"
        onClick={toggle}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
      >
        <MorphIcon icon={dark ? Sun : Moon} size={16} reducedMotion="user" />
        <span>{dark ? NAV_LABELS.themeLight : NAV_LABELS.themeDark}</span>
      </Button>
    </aside>
  )
}

const MobileSidebar = () => {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { dark, toggle } = useDarkMode()
  return (
    <div className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 bg-gray-100 px-4 py-3 dark:border-gray-800 dark:bg-gray-900 lg:hidden">
      <div className="text-xl font-bold text-gray-900 dark:text-gray-50">{NAV_LABELS.brand}</div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" aria-label={open ? NAV_LABELS.closeMenu : NAV_LABELS.openMenu}>
            <MorphIcon icon={open ? X : Menu} size={20} reducedMotion="user" />
          </Button>
        </DialogTrigger>
        <DialogContent className="left-0 top-0 h-full max-w-xs translate-x-0 translate-y-0 rounded-none p-0">
          <div className="flex h-full flex-col bg-gray-100 p-6 dark:bg-gray-900" style={{ width: 280 }}>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-50">{NAV_LABELS.brand}</div>
            <nav className="flex-1 space-y-2 pt-4">
              {navItems.map(item => {
                const active = pathname === item.href
                const Icon = item.icon
                return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 hover:scale-105 hover:bg-gray-200 dark:hover:bg-gray-800',
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
            <Button
              variant="ghost"
              size="sm"
              onClick={toggle}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
            >
              <MorphIcon icon={dark ? Sun : Moon} size={16} reducedMotion="user" />
              <span>{dark ? NAV_LABELS.themeLight : NAV_LABELS.themeDark}</span>
            </Button>
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
