import { type ReactNode } from 'react'

type PageHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  meta?: ReactNode
}

export const PageHeader = ({ eyebrow, title, description, action, meta }: PageHeaderProps) => (
  <header className="mb-8 flex flex-col gap-4 border-b border-gray-200 pb-6 dark:border-gray-800 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {eyebrow ? (
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400 dark:text-gray-600">{eyebrow}</div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-gray-50 sm:text-[28px]">{title}</h1>
        {meta}
      </div>
      {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">{description}</p> : null}
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </header>
)
