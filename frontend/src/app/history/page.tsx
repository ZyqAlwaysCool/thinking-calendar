'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, parseISO, isSameMonth, isAfter } from 'date-fns'
import { type DayContentProps } from 'react-day-picker'
import { PageShell } from '@/components/page-shell'
import { Calendar } from '@/components/ui/calendar'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Editor } from '@/components/editor'
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

  useEffect(() => {
    void fetchLogs().catch(() => {})
  }, [fetchLogs])

  const recordedDates = useMemo(() => logs.map(item => parseISO(item.date)), [logs])
  const logMap = useMemo(() => {
    const map = new Map<string, typeof logs[number]>()
    logs.forEach(item => map.set(item.date, item))
    return map
  }, [logs])

  useEffect(() => {
    if (open && currentLog) {
      setDraft(currentLog.content)
    }
  }, [open, currentLog])

  const handleSelect = async (date?: Date) => {
    if (!date) return
    const today = new Date()
    if (isAfter(date, today)) {
      toast.error(PAGE_TEXT.futureDateForbidden)
      return
    }
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

  const openEditor = async (date: string) => {
    const parsed = parseISO(date)
    if (isAfter(parsed, new Date())) {
      toast.error(PAGE_TEXT.futureDateForbidden)
      return
    }
    setSelectedDate(parsed)
    setOpen(true)
    try {
      await fetchLogByDate(format(parsed, 'yyyy-MM-dd'))
    } catch {
      // 已有提示
    }
  }

  const handleDialogChange = (value: boolean) => {
    setOpen(value)
    if (!value) {
      setSelectedDate(undefined)
      setDraft('')
    }
  }

  return (
    <PageShell>
      <div className="space-y-6">
        <div className="text-3xl font-semibold text-gray-900 dark:text-gray-50">{NAV_LABELS.history}</div>
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
              {monthLogs.map(item => (
                <Card key={item.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-50">{formatDateLabel(item.date)}</div>
                    <div className="text-sm text-gray-300 dark:text-gray-300">{formatShortDate(item.date)}</div>
                  </div>
                  <div className="prose prose-gray max-w-none text-sm dark:prose-invert">
                    <ReactMarkdown>{item.content || PAGE_TEXT.emptyLog}</ReactMarkdown>
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
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => handleDialogChange(false)}>
              {DIALOG_TEXT.close}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? PAGE_TEXT.loading : PAGE_TEXT.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}

export default HistoryPage
