'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DIALOG_TEXT, PAGE_TEXT } from '@/lib/constants'
import { type ConfirmDeleteProps } from '@/types'

export const ConfirmDeleteDialog = ({ open, onOpenChange, onConfirm }: ConfirmDeleteProps) => {
  const [deleting, setDeleting] = useState(false)

  const handleConfirm = async () => {
    setDeleting(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch {
      // 错误提示由数据层负责
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{PAGE_TEXT.confirmDeleteTitle}</DialogTitle></DialogHeader>
        <div className="text-sm text-gray-600 dark:text-gray-300">{PAGE_TEXT.confirmDeleteHint}</div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{DIALOG_TEXT.close}</Button>
          <Button variant="danger" onClick={handleConfirm} disabled={deleting}>
            {deleting ? PAGE_TEXT.loading : PAGE_TEXT.confirmDeleteAction}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
