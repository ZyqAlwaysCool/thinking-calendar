'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { format, parseISO, isSameMonth, isAfter } from 'date-fns'
import { type DayContentProps } from 'react-day-picker'
import { PageShell } from '@/components/page-shell'
import { Calendar } from '@/components/ui/calendar'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { downloadMarkdown } from '@/lib/download-markdown'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Editor } from '@/components/editor'
import { SaveStatus } from '@/components/save-status'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { useAutoSave } from '@/lib/use-auto-save'
import { DIALOG_TEXT, NAV_LABELS, PAGE_TEXT } from '@/lib/constants'
import { cn, formatDateLabel, formatShortDate, formatTime } from '@/lib/utils'
import { useLogStore } from '@/stores/use-log-store'
import { toast } from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'

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
  const logMap = useMemo(() => {
    const map = new Map<string, typeof logs[number]>()
    logs.forEach(item => map.set(item.date, item))
    return map
  }, [logs])

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
    canSave: (value) => value.trim().length > 0,
    onSave: async (nextContent) => {
      await saveLog({ date: selectedDateKey, content: nextContent }, true)
      await fetchLogs(true)
    }
  })

  const handleSelect = async (date?: Date) => {
    if (!date) return
    const today = new Date()
    if (isAfter(date, today)) {
      toast.error(PAGE_TEXT.futureDateForbidden)
      return
    }
    hydratedDateRef.current = ''
    setDraft('')
    setSelectedDate(date)
    setDisplayMonth(date)
    setOpen(true)
    try {
      await fetchLogByDate(format(date, 'yyyy-MM-dd'))
    } catch {
      // 已有提示
    }
  }

  const handleSave = async () => {
    if (!selectedDate) return
    if (!draft.trim() && currentLog?.id) {
      setDeleteOpen(true)
      return
    }
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    try {
      await saveLog({ date: dateStr, content: draft })
      await fetchLogs()
      handleDialogChange(false)
    } catch {
      // 已有提示
    }
  }

  const sortedLogs = useMemo(() => [...logs].sort((a, b) => (a.date < b.date ? 1 : -1)), [logs])
  const monthLogs = useMemo(
    () => sortedLogs.filter(item => isSameMonth(parseISO(item.date), displayMonth)),
    [sortedLogs, displayMonth]
  )
  const visibleLogs = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return monthLogs
    return sortedLogs.filter(item =>
      item.date.includes(normalized) || item.content.toLowerCase().includes(normalized)
    )
  }, [query, monthLogs, sortedLogs])

  const handleExportRecords = () => {
    const content = sortedLogs.map(item => `# ${formatDateLabel(item.date)}\n\n${item.content}`).join('\n\n---\n\n')
    downloadMarkdown('工作记录.md', content)
  }

  const openEditor = async (date: string) => {
    const parsed = parseISO(date)
    if (isAfter(parsed, new Date())) {
      toast.error(PAGE_TEXT.futureDateForbidden)
      return
    }
    hydratedDateRef.current = ''
    setDraft('')
    setSelectedDate(parsed)
    setOpen(true)
    try {
      await fetchLogByDate(format(parsed, 'yyyy-MM-dd'))
    } catch {
      // 已有提示
    }
  }

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

  return (
    <PageShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-3xl font-semibold text-gray-900 dark:text-gray-50">{NAV_LABELS.history}</div>
          <Button variant="outline" onClick={handleExportRecords} disabled={logs.length === 0}>
            {PAGE_TEXT.exportRecords}
          </Button>
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={PAGE_TEXT.searchRecords}
          aria-label={PAGE_TEXT.searchRecords}
        />
        {loading ? (
          <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
            <Skeleton className="h-[400px] w-full" />
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
            <Calendar
              mode="single"
              selected={selectedDate}
              month={displayMonth}
              onMonthChange={(m) => setDisplayMonth(m ?? new Date())}
              onSelect={handleSelect}
              components={{
                DayContent: ({ date }: DayContentProps) => {
                  const hasLog = logMap.has(format(date, 'yyyy-MM-dd'))
                  return (
                    <div className="relative flex h-10 w-10 items-center justify-center">
                      <span>{date.getDate()}</span>
                      {hasLog && <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-black dark:bg-white" />}
                    </div>
                  )
                }
              }}
              modifiers={{ recorded: recordedDates }}
            />
            <div className="space-y-3">
              {visibleLogs.length === 0 && (
                <div className="rounded-xl border border-gray-200 p-6 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  {query.trim() ? PAGE_TEXT.noSearchResults : PAGE_TEXT.noLog}
                </div>
              )}
              {visibleLogs.map(item => (
                <Card key={item.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-50">{formatDateLabel(item.date)}</div>
                    <div className="text-sm text-gray-300 dark:text-gray-300">{formatShortDate(item.date)}</div>
                  </div>
                  <div className="prose prose-gray max-w-none text-sm dark:prose-invert">
                    <ReactMarkdown>
                      {item.content.length > 180 ? `${item.content.slice(0, 180)}…` : item.content || PAGE_TEXT.emptyLog}
                    </ReactMarkdown>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-300 dark:text-gray-300">
                      {`${formatTime(item.updatedAt)} ${PAGE_TEXT.lastUpdated}`}
                    </div>
                    <Button size="sm" onClick={() => openEditor(item.date)}>
                      {DIALOG_TEXT.edit}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDate ? `${PAGE_TEXT.viewInDialog} · ${formatDateLabel(format(selectedDate, 'yyyy-MM-dd'))}` : DIALOG_TEXT.editLog}
            </DialogTitle>
          </DialogHeader>
          <Editor value={draft} onChange={setDraft} minHeight="400px" />
          <SaveStatus status={status} onRetry={() => { void saveNow() }} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => handleDialogChange(false)}>
              {DIALOG_TEXT.close}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? PAGE_TEXT.loading : draft.trim() ? PAGE_TEXT.save : PAGE_TEXT.deleteRecord}
            </Button>
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
