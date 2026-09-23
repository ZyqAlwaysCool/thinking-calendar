'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  ClipboardCheck,
  FileText,
  History,
  LayoutDashboard,
  Menu,
  Moon,
  Settings,
  Sun,
  X
} from 'lucide-react'
import { NAV_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useDarkMode } from '@/app/providers'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog'

const workItems = [
  { href: '/today', label: NAV_LABELS.today, icon: CalendarDays },
  { href: '/history', label: NAV_LABELS.history, icon: History },
  { href: '/dashboard', label: NAV_LABELS.dashboard, icon: LayoutDashboard },
  { href: '/reports', label: NAV_LABELS.reports, icon: FileText }
]

const toolItems = [
  { href: '/attendance', label: NAV_LABELS.attendance, icon: ClipboardCheck }
]

const NavLink = ({
  href,
  label,
  icon: Icon,
  active,
  onClick
}: {
  href: string
  label: string
  icon: typeof CalendarDays
  active: boolean
  onClick?: () => void
}) => (
  <Link
    href={href}
    onClick={onClick}
    className={cn(
      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
      active
        ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-950'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-gray-50'
    )}
  >
    <Icon className="h-[18px] w-[18px]" />
    <span>{label}</span>
  </Link>
)

const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const pathname = usePathname()
  const { dark, toggle } = useDarkMode()

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pb-8 pt-1">
        <div className="text-[15px] font-semibold tracking-tight text-gray-950 dark:text-gray-50">
          Thinking Calendar
        </div>
        <div className="mt-1 text-xs text-gray-400 dark:text-gray-600">工作记录与回顾</div>
      </div>

      <nav className="flex-1 space-y-7">
        <div>
          <div className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400 dark:text-gray-600">
            工作
          </div>
          <div className="space-y-1">
            {workItems.map(item => (
              <NavLink
                key={item.href}
                {...item}
                active={pathname === item.href}
                onClick={onNavigate}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400 dark:text-gray-600">
            工具
          </div>
          <div className="space-y-1">
            {toolItems.map(item => (
              <NavLink
                key={item.href}
                {...item}
                active={pathname === item.href}
                onClick={onNavigate}
              />
            ))}
          </div>
        </div>
      </nav>

      <div className="space-y-1 border-t border-gray-200 pt-4 dark:border-gray-800">
        <NavLink
          href="/settings"
          label={NAV_LABELS.settings}
          icon={Settings}
          active={pathname === '/settings'}
          onClick={onNavigate}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          className="h-10 w-full justify-start gap-3 px-3 text-gray-500 dark:text-gray-400"
        >
          {dark ? <Sun className="h-[17px] w-[17px]" /> : <Moon className="h-[17px] w-[17px]" />}
          <span>{dark ? NAV_LABELS.themeLight : NAV_LABELS.themeDark}</span>
        </Button>
      </div>
    </div>
  )
}

const DesktopSidebar = () => (
  <aside className="fixed inset-y-0 left-0 hidden w-[240px] border-r border-gray-200 bg-white px-4 py-6 dark:border-gray-800 dark:bg-gray-950 lg:block">
    <SidebarContent />
  </aside>
)

const MobileSidebar = () => {
  const [open, setOpen] = useState(false)
  return (
    <div className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95 lg:hidden">
      <div>
        <div className="text-sm font-semibold tracking-tight text-gray-950 dark:text-gray-50">Thinking Calendar</div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label={open ? NAV_LABELS.closeMenu : NAV_LABELS.openMenu}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </DialogTrigger>
        <DialogContent className="left-0 top-0 h-full w-[280px] max-w-none translate-x-0 translate-y-0 rounded-none border-y-0 border-l-0 p-5">
          <SidebarContent onNavigate={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const Sidebar = () => (
  <>
    <MobileSidebar />
    <DesktopSidebar />
  </>
)
