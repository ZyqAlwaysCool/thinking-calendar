'use client'

import { Button } from '@/components/ui/button'
import { PAGE_TEXT } from '@/lib/constants'
import { type AutoSaveStatus } from '@/types'

type SaveStatusProps = {
  status: AutoSaveStatus
  onRetry: () => void
}

export const SaveStatus = ({ status, onRetry }: SaveStatusProps) => (
  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400" role="status">
    <span>{PAGE_TEXT.autoSaveStatus[status]}</span>
    {status === 'error' && (
      <Button size="sm" variant="ghost" onClick={onRetry}>
        {PAGE_TEXT.retrySave}
      </Button>
    )}
  </div>
)
