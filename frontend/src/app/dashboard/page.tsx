'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, isAfter } from 'date-fns'
import { PageShell } from '@/components/page-shell'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Editor } from '@/components/editor'
import { SaveStatus } from '@/components/save-status'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { useAutoSave } from '@/lib/use-auto-save'
import { Button } from '@/components/ui/button'
import { DIALOG_TEXT, PAGE_TEXT } from '@/lib/constants'
import { formatDateLabel } from '@/lib/utils'
import { useLogStore } from '@/stores/use-log-store'
import { useDashboardStore } from '@/stores/use-dashboard-store'
import { toast } from 'react-hot-toast'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DashboardPage = () => {
  const { fetchLogByDate, currentLog, saveLog, saving } = useLogStore()
  const { data: dashboard, fetchMonth, loading } = useDashboardStore()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const hydratedDateRef = useRef('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const now = useMemo(() => new Date(), [])
  const [displayMonth, setDisplayMonth] = useState(now)

  useEffect(() => {
    const month = format(displayMonth, 'yyyy-MM')
    void fetchMonth(month).catch(() => {})
  }, [fetchMonth, displayMonth])

  const selectedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''
  useEffect(() => {
    if (open && currentLog?.date === selectedDateKey && hydratedDateRef.current !== selectedDateKey) {
      setDraft(currentLog.content)
      hydratedDateRef.current = selectedDateKey
    }
  }, [currentLog, open, selectedDateKey])

  const { status, saveNow } = useAutoSave({
    value: draft,
    savedValue: currentLog?.date === selectedDateKey ? currentLog.content : '',
    enabled: open && !!selectedDateKey && hydratedDateRef.current === selectedDateKey,
    canSave: (value) => value.trim().length > 0,
    onSave: async (nextContent) => {
      await saveLog({ date: selectedDateKey, content: nextContent }, true)
      await fetchMonth(format(displayMonth, 'yyyy-MM'), true)
    }
  })

  const monthLabel = format(displayMonth, 'yyyy年MM月')

  const monthDays = useMemo(() => {
    const start = startOfMonth(displayMonth)
    const end = endOfMonth(displayMonth)
    const calendarStart = startOfWeek(start, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(end, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [displayMonth])

  const recordedSet = useMemo(
    () => new Set((dashboard?.days || []).filter(day => day.hasRecord).map(day => day.date)),
    [dashboard]
  )
  const recordedCount = dashboard?.recordedDays ?? 0
  const missingCount = dashboard?.missingDays ?? 0
  const rate = dashboard?.rate ?? 0

  const openDialog = async (day: Date) => {
    if (isAfter(day, new Date())) {
      toast.error(PAGE_TEXT.futureDateForbidden)
      return
    }
    hydratedDateRef.current = ''
    setDraft('')
    setSelectedDate(day)
    setOpen(true)
    try {
      await fetchLogByDate(format(day, 'yyyy-MM-dd'))
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
      const month = format(displayMonth, 'yyyy-MM')
      await fetchMonth(month)
      setOpen(false)
      hydratedDateRef.current = ''
    } catch {
      // 已有提示
    }
  }

  return (
    <PageShell>
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-3xl font-semibold text-gray-900 dark:text-gray-50">{`${monthLabel}${PAGE_TEXT.dashboardTitle}`}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setDisplayMonth(addMonths(displayMonth, -1))} aria-label={PAGE_TEXT.previousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDisplayMonth(addMonths(displayMonth, 1))}
                disabled={format(displayMonth, 'yyyy-MM') >= format(now, 'yyyy-MM')}
                aria-label={PAGE_TEXT.nextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="text-gray-700 dark:text-gray-300">
            {`${PAGE_TEXT.statisticsPrefix} ${recordedCount} 天　${PAGE_TEXT.statisticsGap} ${missingCount} 天　${PAGE_TEXT.statisticsRate} ${rate}%`}
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-[500px] w-full" />
        ) : (
          <Card className="min-h-[500px] hover:scale-100">
            <div className="grid grid-cols-7 gap-2">
              {monthDays.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const isRecorded = recordedSet.has(dateStr)
                const isToday = isSameDay(day, now)
                const inMonth = isSameMonth(day, displayMonth)
                const isFuture = isAfter(day, now)
                const colorClass = isFuture
                  ? 'border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-600'
                  : isRecorded
                    ? 'border-gray-900 bg-gray-800 text-gray-50'
                    : 'border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-800 dark:bg-gray-900'
                const stateClass = isFuture
                  ? 'cursor-not-allowed'
                  : 'hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-100 dark:hover:text-red-700 hover:shadow-md'
                const dimClass = !inMonth ? 'opacity-40' : ''
                const todayClass = isToday ? 'border-4' : ''
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => openDialog(day)}
                    disabled={isFuture}
                    className={`flex flex-col items-center justify-center rounded-lg border h-20 text-sm ${colorClass} ${stateClass} ${dimClass} ${todayClass} transition-all duration-200`}
                  >
                    <span className="text-lg font-semibold">{day.getDate()}</span>
                    {!isRecorded && !isFuture && <span className="text-xs">{PAGE_TEXT.missingFill}</span>}
                    {isRecorded && <span className="text-xs text-gray-200 dark:text-gray-300">{PAGE_TEXT.recordedTag}</span>}
                  </button>
                )
              })}
            </div>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setOpen(true)
          return
        }
        void (async () => {
          const saved = await saveNow()
          if (!saved && draft.trim()) return
          setOpen(false)
          hydratedDateRef.current = ''
        })()
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDate ? `${PAGE_TEXT.viewInDialog} · ${formatDateLabel(format(selectedDate, 'yyyy-MM-dd'))}` : DIALOG_TEXT.editLog}
            </DialogTitle>
          </DialogHeader>
          <Editor value={draft} onChange={setDraft} minHeight="400px" />
          <SaveStatus status={status} onRetry={() => { void saveNow() }} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => { void saveNow().then((saved) => { if (saved || !draft.trim()) setOpen(false) }) }}>
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
          await fetchMonth(format(displayMonth, 'yyyy-MM'), true)
          setOpen(false)
          hydratedDateRef.current = ''
        }}
      />
    </PageShell>
  )
}

export default DashboardPage
