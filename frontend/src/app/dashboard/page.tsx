'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek
} from 'date-fns'
import { PageShell } from '@/components/page-shell'
import { PageHeader } from '@/components/page-header'
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
import { cn } from '@/lib/utils'

const weekdays = ['一', '二', '三', '四', '五', '六', '日']

const DashboardPage = () => {
  const { fetchLogByDate, currentLog, saveLog } = useLogStore()
  const { data: dashboard, fetchMonth, loading } = useDashboardStore()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const hydratedDateRef = useRef('')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const now = useMemo(() => new Date(), [])
  const [displayMonth, setDisplayMonth] = useState(now)

  useEffect(() => {
    void fetchMonth(format(displayMonth, 'yyyy-MM')).catch(() => {})
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
    canSave: value => value.trim().length > 0,
    onSave: async nextContent => {
      await saveLog({ date: selectedDateKey, content: nextContent }, true)
      await fetchMonth(format(displayMonth, 'yyyy-MM'), true)
    }
  })

  const monthDays = useMemo(() => {
    const start = startOfMonth(displayMonth)
    const end = endOfMonth(displayMonth)
    return eachDayOfInterval({
      start: startOfWeek(start, { weekStartsOn: 1 }),
      end: endOfWeek(end, { weekStartsOn: 1 })
    })
  }, [displayMonth])

  const recordedSet = useMemo(
    () => new Set((dashboard?.days || []).filter(day => day.hasRecord).map(day => day.date)),
    [dashboard]
  )

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
    } catch {}
  }

  const recordedCount = dashboard?.recordedDays ?? 0
  const missingCount = dashboard?.missingDays ?? 0
  const rate = dashboard?.rate ?? 0

  return (
    <PageShell>
      <PageHeader
        eyebrow="回顾"
        title="记录看板"
        description="用一个月的视角看看记录是否完整，点击日期可以补写。"
        action={
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => setDisplayMonth(addMonths(displayMonth, -1))} aria-label={PAGE_TEXT.previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[116px] px-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
              {format(displayMonth, 'yyyy年M月')}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => setDisplayMonth(addMonths(displayMonth, 1))}
              disabled={format(displayMonth, 'yyyy-MM') >= format(now, 'yyyy-MM')}
              aria-label={PAGE_TEXT.nextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <section className="mb-8 grid divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          ['已记录', `${recordedCount} 天`],
          ['待补记录', `${missingCount} 天`],
          ['完整度', `${rate}%`]
        ].map(([label, value]) => (
          <div key={label} className="px-1 py-5 sm:px-6">
            <div className="text-xs text-gray-400">{label}</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-gray-950 dark:text-gray-50">{value}</div>
          </div>
        ))}
      </section>

      {loading ? (
        <Skeleton className="h-[560px] w-full" />
      ) : (
        <section>
          <div className="mb-3 grid grid-cols-7 text-center text-xs font-medium text-gray-400">
            {weekdays.map(day => <div key={day} className="py-2">周{day}</div>)}
          </div>
          <div className="grid grid-cols-7 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
            {monthDays.map((day, index) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const recorded = recordedSet.has(dateStr)
              const today = isSameDay(day, now)
              const inMonth = isSameMonth(day, displayMonth)
              const future = isAfter(day, now)

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => { void openDialog(day) }}
                  disabled={future}
                  className={cn(
                    'relative min-h-[92px] border-b border-r border-gray-100 p-3 text-left transition-colors duration-150 dark:border-gray-900',
                    index % 7 === 6 && 'border-r-0',
                    index >= monthDays.length - 7 && 'border-b-0',
                    !inMonth && 'bg-gray-50/50 text-gray-300 dark:bg-gray-950 dark:text-gray-700',
                    inMonth && !future && 'hover:bg-gray-50 dark:hover:bg-gray-900/50',
                    future && 'cursor-default text-gray-300 dark:text-gray-700'
                  )}
                >
                  <div className={cn(
                    'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm',
                    today && 'bg-gray-900 font-medium text-white dark:bg-gray-100 dark:text-gray-950',
                    !today && inMonth && 'text-gray-700 dark:text-gray-300'
                  )}>
                    {day.getDate()}
                  </div>
                  {inMonth && !future ? (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[11px] text-gray-400">
                      <span className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        recorded ? 'bg-gray-900 dark:bg-gray-100' : 'border border-gray-300 dark:border-gray-700'
                      )} />
                      {recorded ? '已记录' : '待补'}
                    </div>
                  ) : null}
                </button>
              )
            })}
          </div>
        </section>
      )}

      <Dialog open={open} onOpenChange={nextOpen => {
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
        <DialogContent className="max-w-[760px]">
          <DialogHeader>
            <DialogTitle>
              {selectedDate ? formatDateLabel(format(selectedDate, 'yyyy-MM-dd')) : DIALOG_TEXT.editLog}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <SaveStatus status={status} onRetry={() => { void saveNow() }} />
          </div>
          <Editor value={draft} onChange={setDraft} minHeight="420px" />
          <div className="flex justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-red-600 dark:text-gray-600 dark:hover:text-red-400"
              onClick={() => setDeleteOpen(true)}
              disabled={!currentLog?.id}
            >
              删除记录
            </Button>
            <Button variant="outline" size="sm" onClick={() => { void saveNow().then(saved => { if (saved || !draft.trim()) setOpen(false) }) }}>
              {DIALOG_TEXT.close}
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
