'use client'

import { AlertCircle, CheckCircle2, Clock3, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PAGE_TEXT } from '@/lib/constants'
import { type AutoSaveStatus } from '@/types'

type SaveStatusProps = {
  status: AutoSaveStatus
  onRetry: () => void
}

const iconMap = {
  saved: CheckCircle2,
  pending: Clock3,
  saving: Loader2,
  error: AlertCircle,
  empty: AlertCircle
}

export const SaveStatus = ({ status, onRetry }: SaveStatusProps) => {
  const Icon = iconMap[status]
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400" role="status">
      <Icon className={`h-3.5 w-3.5 ${status === 'saving' ? 'animate-spin' : ''}`} />
      <span>{PAGE_TEXT.autoSaveStatus[status]}</span>
      {status === 'error' && (
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onRetry}>
          {PAGE_TEXT.retrySave}
        </Button>
      )}
    </div>
  )
}
