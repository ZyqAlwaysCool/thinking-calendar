import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 transition-colors duration-150 placeholder:text-gray-400 hover:border-gray-300 focus-visible:border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-600 dark:hover:border-gray-700 dark:focus-visible:border-gray-600 dark:focus-visible:ring-gray-800',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)

Input.displayName = 'Input'
