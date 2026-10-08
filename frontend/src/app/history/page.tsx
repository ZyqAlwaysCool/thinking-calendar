'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { format, parseISO, isSameMonth, isAfter } from 'date-fns'
import { type DayContentProps } from 'react-day-picker'
import ReactMarkdown from 'react-markdown'
import { PageShell } from '@/components/page-shell'
import { PageHeader } from '@/components/page-header'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Editor } from '@/components/editor'
import { SaveStatus } from '@/components/save-status'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { useAutoSave } from '@/lib/use-auto-save'
import { DIALOG_TEXT, PAGE_TEXT } from '@/lib/constants'
import { formatDateLabel, formatShortDate, formatTime } from '@/lib/utils'
import { useLogStore } from '@/stores/use-log-store'
import { toast } from 'react-hot-toast'
import { downloadMarkdown } from '@/lib/download-markdown'
import { CalendarDays, Download, Search } from 'lucide-react'

const HistoryPage = () => {
  const { logs, fetchLogs, currentLog, fetchLogByDate, saveLog, loading, saving } = useLogStore()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [displayMonth, setDisplayMonth] = useState<Date>(new Date())
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const hydratedDateRef = useRef('')

  useEffect(() => {
    void fetchLogs().catch(() => {})
  }, [fetchLogs])

  useEffect(() => {
    const date = new URLSearchParams(window.location.search).get('date')
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return
    const parsed = parseISO(date)
    if (isAfter(parsed, new Date())) return
    hydratedDateRef.current = ''
    setDraft('')
    setSelectedDate(parsed)
    setDisplayMonth(parsed)
    setOpen(true)
    void fetchLogByDate(date).catch(() => {})
  }, [fetchLogByDate])

  const recordedDates = useMemo(() => logs.map(item => parseISO(item.date)), [logs])
  const logMap = useMemo(() => new Map(logs.map(item => [item.date, item])), [logs])

  const selectedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''
  useEffect(() => {
    if (open && currentLog?.date === selectedDateKey && hydratedDateRef.current !== selectedDateKey) {
      setDraft(currentLog.content)
      hydratedDateRef.current = selectedDateKey
    }
  }, [open, currentLog, selectedDateKey])

  const { status, saveNow } = useAutoSave({
    value: draft,
    savedValue: currentLog?.date === selectedDateKey ? currentLog.content : '',
    enabled: open && !!selectedDateKey && hydratedDateRef.current === selectedDateKey,
    canSave: value => value.trim().length > 0,
    onSave: async nextContent => {
      await saveLog({ date: selectedDateKey, content: nextContent }, true)
      await fetchLogs(true)
    }
  })

  const openEditor = async (date: string) => {
    const parsed = parseISO(date)
    if (isAfter(parsed, new Date())) {
      toast.error(PAGE_TEXT.futureDateForbidden)
      return
    }
    hydratedDateRef.current = ''
    setDraft('')
    setSelectedDate(parsed)
    setDisplayMonth(parsed)
    setOpen(true)
    try {
      await fetchLogByDate(date)
    } catch {}
  }

  const handleSelect = async (date?: Date) => {
    if (!date) return
    await openEditor(format(date, 'yyyy-MM-dd'))
  }

  const sortedLogs = useMemo(() => [...logs].sort((a, b) => (a.date < b.date ? 1 : -1)), [logs])
  const monthLogs = useMemo(
    () => sortedLogs.filter(item => isSameMonth(parseISO(item.date), displayMonth)),
    [sortedLogs, displayMonth]
  )
  const visibleLogs = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return monthLogs
    return sortedLogs.filter(item => item.date.includes(normalized) || item.content.toLowerCase().includes(normalized))
  }, [query, monthLogs, sortedLogs])

  const handleDialogChange = (value: boolean) => {
    if (value) {
      setOpen(true)
      return
    }
    void (async () => {
      const saved = await saveNow()
      if (!saved && draft.trim()) return
      setOpen(false)
      setSelectedDate(undefined)
      setDraft('')
      hydratedDateRef.current = ''
    })()
  }

  const handleExportRecords = () => {
    const content = sortedLogs.map(item => `# ${formatDateLabel(item.date)}\n\n${item.content}`).join('\n\n---\n\n')
    downloadMarkdown('工作记录.md', content)
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="记录"
        title="历史"
        description="按时间回看工作记录，搜索过去做过的事情。"
        action={
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportRecords} disabled={logs.length === 0}>
            <Download className="h-4 w-4" />
            导出
          </Button>
        }
      />

      <div className="mb-7 flex max-w-xl items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={PAGE_TEXT.searchRecords}
            aria-label={PAGE_TEXT.searchRecords}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          <Skeleton className="h-[360px] w-full" />
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="min-w-0">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {query.trim() ? '搜索结果' : format(displayMonth, 'yyyy年M月')}
              </div>
              <div className="text-xs text-gray-400">{visibleLogs.length} 条记录</div>
            </div>

            {visibleLogs.length === 0 ? (
              <div className="border-y border-dashed border-gray-200 py-16 text-center text-sm text-gray-400 dark:border-gray-800">
                {query.trim() ? PAGE_TEXT.noSearchResults : PAGE_TEXT.noLog}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">
                {visibleLogs.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { void openEditor(item.date) }}
                    className="group grid w-full gap-4 py-5 text-left transition-colors duration-150 hover:bg-gray-50/80 dark:hover:bg-gray-900/40 sm:grid-cols-[96px_minmax(0,1fr)] sm:px-2"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatShortDate(item.date)}</div>
                      <div className="mt-1 text-xs text-gray-400">{formatTime(item.updatedAt)}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">{formatDateLabel(item.date)}</div>
                      <div className="prose prose-sm prose-gray max-w-none overflow-hidden text-gray-500 line-clamp-3 dark:prose-invert dark:text-gray-400">
                        <ReactMarkdown>{item.content || PAGE_TEXT.emptyLog}</ReactMarkdown>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              <CalendarDays className="h-4 w-4" />
              日期
            </div>
            <Calendar
              mode="single"
              selected={selectedDate}
              month={displayMonth}
              onMonthChange={month => setDisplayMonth(month ?? new Date())}
              onSelect={handleSelect}
              components={{
                DayContent: ({ date }: DayContentProps) => {
                  const hasLog = logMap.has(format(date, 'yyyy-MM-dd'))
                  return (
                    <div className="relative flex h-10 w-10 items-center justify-center">
                      <span>{date.getDate()}</span>
                      {hasLog ? <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-current opacity-70" /> : null}
                    </div>
                  )
                }
              }}
              modifiers={{ recorded: recordedDates }}
            />
          </aside>
        </div>
      )}

      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogContent className="!left-auto !right-0 !top-0 !h-screen !w-full !max-w-[720px] !translate-x-0 !translate-y-0 !rounded-none !border-y-0 !border-r-0 p-0">
          <div className="flex h-full flex-col">
            <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
              <DialogHeader>
                <DialogTitle>
                  {selectedDate ? formatDateLabel(format(selectedDate, 'yyyy-MM-dd')) : DIALOG_TEXT.editLog}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-2">
                <SaveStatus status={status} onRetry={() => { void saveNow() }} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <Editor value={draft} onChange={setDraft} quiet minHeight="calc(100vh - 210px)" />
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-800">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-red-600 dark:text-gray-600 dark:hover:text-red-400"
                onClick={() => setDeleteOpen(true)}
                disabled={!currentLog?.id}
              >
                删除记录
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDialogChange(false)} disabled={saving}>
                {DIALOG_TEXT.close}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={async () => {
          if (!selectedDate) return
          await saveLog({ date: format(selectedDate, 'yyyy-MM-dd'), content: '' })
          await fetchLogs(true)
          setOpen(false)
          setDraft('')
          hydratedDateRef.current = ''
        }}
      />
    </PageShell>
  )
}

export default HistoryPage
