'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageShell } from '@/components/page-shell'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Editor } from '@/components/editor'
import { SaveStatus } from '@/components/save-status'
import { useAutoSave } from '@/lib/use-auto-save'
import { DIALOG_TEXT, PAGE_TEXT } from '@/lib/constants'
import { useSettingsStore } from '@/stores/use-settings-store'
import { ChevronRight } from 'lucide-react'

const SettingsPage = () => {
  const { settings, loading, saving, fetchSettings, updateSettings } = useSettingsStore()
  const [weekOpen, setWeekOpen] = useState(false)
  const [monthOpen, setMonthOpen] = useState(false)
  const [weekDraft, setWeekDraft] = useState('')
  const [monthDraft, setMonthDraft] = useState('')

  useEffect(() => {
    void fetchSettings().catch(() => {})
  }, [fetchSettings])

  useEffect(() => {
    if (!settings) return
    if (!weekOpen) setWeekDraft(settings.reportTemplateWeek)
    if (!monthOpen) setMonthDraft(settings.reportTemplateMonth)
  }, [settings, weekOpen, monthOpen])

  const weekAutoSave = useAutoSave({
    value: weekDraft,
    savedValue: settings?.reportTemplateWeek ?? '',
    enabled: weekOpen && !!settings,
    onSave: async nextContent => {
      if (!settings) return
      await updateSettings({
        reportTemplateWeek: nextContent,
        reportTemplateMonth: settings.reportTemplateMonth
      }, true)
    }
  })

  const monthAutoSave = useAutoSave({
    value: monthDraft,
    savedValue: settings?.reportTemplateMonth ?? '',
    enabled: monthOpen && !!settings,
    onSave: async nextContent => {
      if (!settings) return
      await updateSettings({
        reportTemplateWeek: settings.reportTemplateWeek,
        reportTemplateMonth: nextContent
      }, true)
    }
  })

  const previewText = useMemo(
    () => ({
      week: weekDraft || PAGE_TEXT.settingsEmpty,
      month: monthDraft || PAGE_TEXT.settingsEmpty
    }),
    [weekDraft, monthDraft]
  )

  const handleSaveWeek = async () => {
    if (await weekAutoSave.saveNow()) setWeekOpen(false)
  }

  const handleSaveMonth = async () => {
    if (await monthAutoSave.saveNow()) setMonthOpen(false)
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-[900px]">
        <PageHeader
          eyebrow="偏好"
          title="设置"
          description="管理报告生成时使用的自定义模板。这里的修改不会影响历史记录和已有报告。"
        />

        <section>
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">报告模板</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">仅在需要时编辑。留空时使用系统默认模板。</p>
          </div>

          {loading ? (
            <div className="divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">
              <div className="py-5"><Skeleton className="h-16 w-full" /></div>
              <div className="py-5"><Skeleton className="h-16 w-full" /></div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">
              {[
                {
                  title: PAGE_TEXT.settingsWeekTitle,
                  value: previewText.week,
                  empty: !weekDraft,
                  onClick: () => setWeekOpen(true)
                },
                {
                  title: PAGE_TEXT.settingsMonthTitle,
                  value: previewText.month,
                  empty: !monthDraft,
                  onClick: () => setMonthOpen(true)
                }
              ].map(item => (
                <button
                  key={item.title}
                  type="button"
                  onClick={item.onClick}
                  className="grid w-full gap-3 py-5 text-left transition-colors duration-150 hover:bg-gray-50/70 dark:hover:bg-gray-900/30 sm:grid-cols-[180px_minmax(0,1fr)_24px] sm:px-2"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.title}</div>
                    <div className="mt-1 text-xs text-gray-400">自定义生成规则</div>
                  </div>
                  <div className={item.empty ? 'line-clamp-3 text-sm leading-6 text-gray-400' : 'line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-gray-600 dark:text-gray-300'}>
                    {item.value}
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 text-gray-300 dark:text-gray-700" />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog open={weekOpen} onOpenChange={open => { if (open) setWeekOpen(true); else void handleSaveWeek() }}>
        <DialogContent className="max-w-[760px]">
          <DialogHeader>
            <DialogTitle>{PAGE_TEXT.settingsWeekTitle}</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <SaveStatus status={weekAutoSave.status} onRetry={() => { void weekAutoSave.saveNow() }} />
          </div>
          <Editor value={weekDraft} onChange={setWeekDraft} minHeight="360px" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { void handleSaveWeek() }}>{DIALOG_TEXT.close}</Button>
            <Button onClick={handleSaveWeek} disabled={saving}>
              {saving ? PAGE_TEXT.loading : PAGE_TEXT.settingsSave}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={monthOpen} onOpenChange={open => { if (open) setMonthOpen(true); else void handleSaveMonth() }}>
        <DialogContent className="max-w-[760px]">
          <DialogHeader>
            <DialogTitle>{PAGE_TEXT.settingsMonthTitle}</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <SaveStatus status={monthAutoSave.status} onRetry={() => { void monthAutoSave.saveNow() }} />
          </div>
          <Editor value={monthDraft} onChange={setMonthDraft} minHeight="360px" />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { void handleSaveMonth() }}>{DIALOG_TEXT.close}</Button>
            <Button onClick={handleSaveMonth} disabled={saving}>
              {saving ? PAGE_TEXT.loading : PAGE_TEXT.settingsSave}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}

export default SettingsPage
