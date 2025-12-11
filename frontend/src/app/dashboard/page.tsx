'use client'

import { useEffect, useMemo, useState } from 'react'
import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns'
import { PageShell } from '@/components/page-shell'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Editor } from '@/components/editor'
import { Button } from '@/components/ui/button'
import { DIALOG_TEXT, NAV_LABELS, PAGE_TEXT } from '@/lib/constants'
import { formatDateLabel } from '@/lib/utils'
import { useLogStore } from '@/stores/use-log-store'

const DashboardPage = () => {
  const { logs, fetchLogs, fetchLogByDate, currentLog, saveLog, loading, saving } = useLogStore()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  useEffect(() => {
    void fetchLogs().catch(() => {})
  }, [fetchLogs])

  useEffect(() => {
    if (currentLog && open) {
      setDraft(currentLog.content)
    }
  }, [currentLog, open])

  const now = new Date()
  const monthLabel = format(now, 'yyyy年MM月')

  const monthDays = useMemo(() => {
    const start = startOfMonth(now)
    const end = endOfMonth(now)
    const calendarStart = startOfWeek(start, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(end, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [now])

  const recordedSet = useMemo(() => new Set(logs.map(item => item.date)), [logs])
  const currentMonthDays = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(now), end: endOfMonth(now) }),
    [now]
  )
  const recordedCount = currentMonthDays.filter(day => recordedSet.has(format(day, 'yyyy-MM-dd'))).length
  const missingCount = currentMonthDays.length - recordedCount
  const rate = currentMonthDays.length === 0 ? 0 : Math.round((recordedCount / currentMonthDays.length) * 100)

  const openDialog = async (day: Date) => {
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
      await fetchLogs()
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
          <Card className="min-h-[500px]">
            <div className="grid grid-cols-7 gap-2">
              {monthDays.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const isRecorded = recordedSet.has(dateStr)
                const isToday = isSameDay(day, now)
                const inMonth = isSameMonth(day, now)
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => openDialog(day)}
                    className={`flex h-20 flex-col items-center justify-center rounded-lg border text-sm transition-all duration-200 hover:scale-105 ${
                      isRecorded
                        ? 'border-gray-900 bg-gray-800 text-gray-50'
                        : 'border-gray-200 bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-600 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-red-100 dark:hover:text-red-700'
                    } ${!inMonth ? 'opacity-40' : ''} ${isToday ? 'border-4' : ''}`}
                  >
                    <span className="text-lg font-semibold">{day.getDate()}</span>
                    {!isRecorded && <span className="text-xs">{PAGE_TEXT.missingFill}</span>}
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
