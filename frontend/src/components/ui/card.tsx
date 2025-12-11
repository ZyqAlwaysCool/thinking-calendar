import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-xl border border-gray-200 bg-gray-100 p-6 shadow-card transition-all duration-200 hover:shadow-md hover:scale-[1.02] dark:border-gray-800 dark:bg-gray-900', className)}
      {...props}
    />
  )
)

Card.displayName = 'Card'
