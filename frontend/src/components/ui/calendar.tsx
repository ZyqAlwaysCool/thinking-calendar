import { DayPicker } from 'react-day-picker'
import { cn } from '@/lib/utils'

type CalendarProps = React.ComponentProps<typeof DayPicker>

export const Calendar = ({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) => (
  <DayPicker
    showOutsideDays={showOutsideDays}
    className={cn('rounded-xl border border-gray-200 bg-gray-100 p-4 dark:border-gray-800 dark:bg-gray-900', className)}
    classNames={{
      months: 'flex flex-col space-y-4',
      month: 'space-y-4',
      caption: 'flex justify-between px-2 text-sm font-medium text-gray-800 dark:text-gray-100',
      caption_label: 'text-base font-semibold',
      nav: 'flex items-center space-x-2',
      nav_button:
        'inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 transition-all duration-200 hover:scale-[1.02] dark:text-gray-100 dark:hover:bg-gray-900',
      head_row: 'grid grid-cols-7 text-center text-xs text-gray-300',
      head_cell: 'py-1',
      row: 'grid grid-cols-7 text-center',
      cell: 'relative p-1 text-sm',
      day: 'h-10 w-10 rounded-lg text-gray-700 transition-all duration-200 hover:bg-gray-100 hover:scale-[1.02] dark:text-gray-50 dark:hover:bg-gray-900',
      day_selected: 'bg-gray-900 text-gray-50 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200',
      day_today: 'border-4 border-gray-900 dark:border-gray-100',
      day_outside: 'text-gray-300 dark:text-gray-700',
      day_disabled: 'text-gray-300 opacity-60',
      ...classNames
    }}
    {...props}
  />
)
