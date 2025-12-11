import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-800 transition-all duration-200 hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-50 dark:hover:border-gray-700',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)

Input.displayName = 'Input'
