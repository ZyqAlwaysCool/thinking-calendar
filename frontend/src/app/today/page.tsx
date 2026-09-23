'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { PageShell } from '@/components/page-shell'
import { PageHeader } from '@/components/page-header'
import { Editor } from '@/components/editor'
import { SaveStatus } from '@/components/save-status'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { useAutoSave } from '@/lib/use-auto-save'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PAGE_TEXT } from '@/lib/constants'
import { formatDateLabel } from '@/lib/utils'
import { useLogStore } from '@/stores/use-log-store'
import { Save, Trash2 } from 'lucide-react'

const TodayPage = () => {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [content, setContent] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const hydratedRef = useRef(false)
  const { currentLog, loading, saving, fetchLogByDate, saveLog } = useLogStore()

  const lastUpdatedHint = useMemo(() => {
    if (!currentLog?.updatedAt) return ''
    return formatDistanceToNow(parseISO(currentLog.updatedAt), { locale: zhCN, addSuffix: true })
  }, [currentLog])

  useEffect(() => {
    void fetchLogByDate(today).catch(() => {})
  }, [fetchLogByDate, today])

  useEffect(() => {
    if (currentLog?.date === today && !hydratedRef.current) {
      setContent(currentLog.content)
      hydratedRef.current = true
    }
  }, [currentLog, today])

  const { status, saveNow } = useAutoSave({
    value: content,
    savedValue: currentLog?.content ?? '',
    enabled: hydratedRef.current && !loading,
    canSave: value => value.trim().length > 0,
    onSave: async nextContent => {
      await saveLog({ date: today, content: nextContent }, true)
    }
  })

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void saveNow()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [saveNow])

  const handleDelete = () => {
    if (currentLog?.id) setDeleteOpen(true)
  }

  const wordCount = content.trim().length

  return (
    <PageShell>
      <div className="mx-auto max-w-[860px]">
        <PageHeader
          eyebrow="工作记录"
          title="今天"
          description={`${formatDateLabel(today)} · 把今天值得留下的事情写下来`}
          meta={<SaveStatus status={status} onRetry={() => { void saveNow() }} />}
        />

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-[520px] w-full" />
          </div>
        ) : (
          <section className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 sm:px-7">
            <Editor value={content} onChange={setContent} quiet minHeight="min(62vh, 680px)" />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 text-xs text-gray-400 dark:border-gray-900 dark:text-gray-600">
              <div className="flex items-center gap-3">
                <span>{wordCount} 字</span>
                {lastUpdatedHint && content.trim() ? <span>最近更新 {lastUpdatedHint}</span> : null}
                <span className="hidden sm:inline">⌘/Ctrl + S 立即保存</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => { void saveNow() }}
                  disabled={saving || !content.trim()}
                >
                  <Save className="h-3.5 w-3.5" />
                  保存
                </Button>
                {currentLog?.id ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-xs text-gray-400 hover:text-red-600 dark:text-gray-600 dark:hover:text-red-400"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    删除
                  </Button>
                ) : null}
              </div>
            </div>
          </section>
        )}
      </div>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => saveLog({ date: today, content: '' })}
      />
    </PageShell>
  )
}

export default TodayPage
