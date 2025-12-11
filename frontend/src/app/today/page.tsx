'use client'

import { useEffect, useState } from 'react'
import { addDays, endOfISOWeek, format, startOfISOWeek } from 'date-fns'
import { PageShell } from '@/components/page-shell'
import { Editor } from '@/components/editor'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { NAV_LABELS, PAGE_TEXT } from '@/lib/constants'
import { formatDateLabel, formatWeekLabel } from '@/lib/utils'
import { useLogStore } from '@/stores/use-log-store'
import { useReportStore } from '@/stores/use-report-store'

const TodayPage = () => {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [content, setContent] = useState('')
  const { currentLog, loading, fetchLogByDate, saveLog } = useLogStore()
  const { generateReport, generating } = useReportStore()

  useEffect(() => {
    void fetchLogByDate(today).catch(() => {})
  }, [fetchLogByDate, today])

  useEffect(() => {
    if (currentLog) {
      setContent(currentLog.content)
    }
  }, [currentLog])

  const handleSave = async () => {
    try {
      await saveLog({ date: today, content })
    } catch {
      // 已有提示
    }
  }

  const handleGenerate = async () => {
    const start = format(startOfISOWeek(new Date()), 'yyyy-MM-dd')
    const end = format(endOfISOWeek(new Date()), 'yyyy-MM-dd')
    try {
      await generateReport({ period: 'week', startDate: start, endDate: end, template: 'formal' })
    } catch {
      // 已有提示
    }
  }

  const todayLabel = `${NAV_LABELS.today} · ${formatDateLabel(today)}`
  const weekLabel = formatWeekLabel(today)

  return (
    <PageShell>
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="text-3xl font-semibold text-gray-900 dark:text-gray-50">{todayLabel}</div>
          <div className="text-lg text-gray-300 dark:text-gray-300">{weekLabel}</div>
        </div>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : (
          <Editor value={content} onChange={setContent} />
        )}
      </div>
      <div className="fixed bottom-6 left-4 right-4 lg:left-[300px]">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between rounded-xl border border-gray-200 bg-gray-100 px-6 py-4 shadow-card dark:border-gray-800 dark:bg-gray-900">
          <Button variant="outline" size="lg" onClick={handleSave}>
            {PAGE_TEXT.save}
          </Button>
          <Button size="lg" onClick={handleGenerate} disabled={generating}>
            {generating ? PAGE_TEXT.generating : PAGE_TEXT.todayGenerateAction}
          </Button>
        </div>
      </div>
    </PageShell>
  )
}

export default TodayPage
