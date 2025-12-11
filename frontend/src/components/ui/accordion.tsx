import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { cn } from '@/lib/utils'

export const Accordion = AccordionPrimitive.Root
export const AccordionItem = ({ className, ...props }: AccordionPrimitive.AccordionItemProps) => (
  <AccordionPrimitive.Item className={cn('border-b border-gray-200 dark:border-gray-800', className)} {...props} />
)

export const AccordionTrigger = ({ className, children, ...props }: AccordionPrimitive.AccordionTriggerProps) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      className={cn(
        'flex flex-1 items-center justify-between py-4 text-left text-sm font-medium text-gray-800 transition-all duration-200 hover:scale-[1.02] hover:text-gray-900 dark:text-gray-100 dark:hover:text-gray-50',
        className
      )}
      {...props}
    >
      {children}
      <span className="ml-2 text-base">▾</span>
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
)

export const AccordionContent = ({ className, children, ...props }: AccordionPrimitive.AccordionContentProps) => (
  <AccordionPrimitive.Content
    className={cn(
      'overflow-hidden text-sm text-gray-700 transition-all duration-200 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down dark:text-gray-200',
      className
    )}
    {...props}
  >
    <div className="pb-4">{children}</div>
  </AccordionPrimitive.Content>
)
