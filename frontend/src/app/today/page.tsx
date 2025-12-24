'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { PageShell } from '@/components/page-shell'
import { Editor } from '@/components/editor'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { NAV_LABELS, PAGE_TEXT } from '@/lib/constants'
import { formatDateLabel } from '@/lib/utils'
import { useLogStore } from '@/stores/use-log-store'

const TodayPage = () => {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [content, setContent] = useState('')
  const { currentLog, loading, saving, fetchLogByDate, saveLog } = useLogStore()
  const lastUpdatedHint = useMemo(() => {
    if (!currentLog || !currentLog.updatedAt) return ''
    const updated = parseISO(currentLog.updatedAt)
    return formatDistanceToNow(updated, { locale: zhCN, addSuffix: true })
  }, [currentLog])

  useEffect(() => {
    void fetchLogByDate(today).catch(() => {})
  }, [fetchLogByDate, today])

  useEffect(() => {
    if (currentLog) {
      setContent(currentLog.content)
    }
  }, [currentLog])

  const handleSave = async () => {
    const trimmed = content.trim()
    try {
      await saveLog({ date: today, content: trimmed })
    } catch {
      // 已有提示
    }
  }

  const todayLabel = `${NAV_LABELS.today} · ${formatDateLabel(today)}`

  return (
    <PageShell>
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="text-3xl font-semibold text-gray-900 dark:text-gray-50">{todayLabel}</div>
          {currentLog?.updatedAt && content.trim() && (
            <div className="text-sm text-gray-400 dark:text-gray-500">{`${PAGE_TEXT.lastUpdatedRecent}：${lastUpdatedHint}`}</div>
          )}
        </div>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : (
          <div className="relative">
            <Editor value={content} onChange={setContent} />
            <Button
              size="lg"
              onClick={handleSave}
              disabled={saving}
              className="absolute bottom-6 right-6 bg-gray-900 text-gray-50 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              {PAGE_TEXT.save}
            </Button>
          </div>
        )}
      </div>
    </PageShell>
  )
}

export default TodayPage
