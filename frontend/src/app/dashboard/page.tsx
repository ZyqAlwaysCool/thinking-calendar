'use client'

import { useEffect, useMemo, useState } from 'react'
import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, isAfter } from 'date-fns'
import { PageShell } from '@/components/page-shell'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Editor } from '@/components/editor'
import { Button } from '@/components/ui/button'
import { DIALOG_TEXT, PAGE_TEXT } from '@/lib/constants'
import { formatDateLabel } from '@/lib/utils'
import { useLogStore } from '@/stores/use-log-store'
import { useDashboardStore } from '@/stores/use-dashboard-store'
import { toast } from 'react-hot-toast'

const DashboardPage = () => {
  const { fetchLogByDate, currentLog, saveLog, saving } = useLogStore()
  const { data: dashboard, fetchMonth, loading } = useDashboardStore()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const now = useMemo(() => new Date(), [])

  useEffect(() => {
    const month = format(new Date(), 'yyyy-MM')
    void fetchMonth(month).catch(() => {})
  }, [fetchMonth])

  useEffect(() => {
    if (currentLog && open) {
      setDraft(currentLog.content)
    }
  }, [currentLog, open])

  const monthLabel = format(now, 'yyyy年MM月')

  const monthDays = useMemo(() => {
    const start = startOfMonth(now)
    const end = endOfMonth(now)
    const calendarStart = startOfWeek(start, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(end, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [now])

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
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    try {
      await saveLog({ date: dateStr, content: draft })
      const month = format(new Date(), 'yyyy-MM')
      await fetchMonth(month)
      setOpen(false)
    } catch {
      // 已有提示
    }
  }

  return (
    <PageShell>
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="text-3xl font-semibold text-gray-900 dark:text-gray-50">{`${monthLabel}${PAGE_TEXT.dashboardTitle}`}</div>
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
                const inMonth = isSameMonth(day, now)
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDate ? `${PAGE_TEXT.viewInDialog} · ${formatDateLabel(format(selectedDate, 'yyyy-MM-dd'))}` : DIALOG_TEXT.editLog}
            </DialogTitle>
          </DialogHeader>
          <Editor value={draft} onChange={setDraft} minHeight="400px" />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
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

export default DashboardPage
