import * as RadixDialog from '@radix-ui/react-dialog'
import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const Dialog = RadixDialog.Root
export const DialogTrigger = RadixDialog.Trigger
export const DialogPortal = RadixDialog.Portal
export const DialogClose = RadixDialog.Close

export const DialogOverlay = ({ className, ...props }: RadixDialog.DialogOverlayProps) => (
  <RadixDialog.Overlay
    className={cn('fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]', className)}
    {...props}
  />
)

export const DialogContent = ({ className, children, ...props }: RadixDialog.DialogContentProps) => (
  <DialogPortal>
    <DialogOverlay />
    <RadixDialog.Content
      className={cn(
        'fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-[960px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-6 max-h-[90vh] overflow-y-auto shadow-2xl dark:border-gray-800 dark:bg-gray-950',
        className
      )}
      {...props}
    >
      {children}
    </RadixDialog.Content>
  </DialogPortal>
)

export const DialogHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('space-y-2 text-left', className)} {...props} />
)

export const DialogFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex justify-end gap-3 pt-4', className)} {...props} />
)

export const DialogTitle = ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <RadixDialog.Title className={cn('text-lg font-semibold tracking-tight text-gray-950 dark:text-gray-50', className)} {...props} />
)

export const DialogDescription = ({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <RadixDialog.Description className={cn('text-sm text-gray-500 dark:text-gray-400', className)} {...props} />
)
