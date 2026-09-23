'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageShell } from '@/components/page-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Editor } from '@/components/editor'
import { SaveStatus } from '@/components/save-status'
import { useAutoSave } from '@/lib/use-auto-save'
import { DIALOG_TEXT, NAV_LABELS, PAGE_TEXT } from '@/lib/constants'
import { useSettingsStore } from '@/stores/use-settings-store'
import { cn } from '@/lib/utils'

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
    onSave: async (nextContent) => {
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
    onSave: async (nextContent) => {
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
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="text-3xl font-semibold text-gray-900 dark:text-gray-50">{NAV_LABELS.settings}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{PAGE_TEXT.settingsSubtitle}</div>
        </div>

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="space-y-4 p-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-24" />
            </Card>
            <Card className="space-y-4 p-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-24" />
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="space-y-4">
              <div className="flex items-center justify-between px-4 pt-4">
                <div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-50">{PAGE_TEXT.settingsWeekTitle}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{PAGE_TEXT.settingsTemplateHint}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setWeekOpen(true)}
                  className="hover:scale-105 transition-all duration-200"
                >
                  {PAGE_TEXT.settingsEdit}
                </Button>
              </div>
              <div className="px-4 pb-4">
                <div
                  className={cn(
                    'min-h-[140px] rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-700 transition-all duration-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200',
                    !weekDraft && 'text-gray-400 dark:text-gray-500'
                  )}
                >
                  {previewText.week}
                </div>
              </div>
            </Card>

            <Card className="space-y-4">
              <div className="flex items-center justify-between px-4 pt-4">
                <div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-50">{PAGE_TEXT.settingsMonthTitle}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{PAGE_TEXT.settingsTemplateHint}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMonthOpen(true)}
                  className="hover:scale-105 transition-all duration-200"
                >
                  {PAGE_TEXT.settingsEdit}
                </Button>
              </div>
              <div className="px-4 pb-4">
                <div
                  className={cn(
                    'min-h-[140px] rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-700 transition-all duration-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200',
                    !monthDraft && 'text-gray-400 dark:text-gray-500'
                  )}
                >
                  {previewText.month}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={weekOpen} onOpenChange={(open) => { if (open) setWeekOpen(true); else void handleSaveWeek() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{PAGE_TEXT.settingsWeekTitle}</DialogTitle>
          </DialogHeader>
          <Editor value={weekDraft} onChange={setWeekDraft} minHeight="300px" />
          <SaveStatus status={weekAutoSave.status} onRetry={() => { void weekAutoSave.saveNow() }} />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => { void handleSaveWeek() }}
              className="hover:scale-105 transition-all duration-200"
            >
              {DIALOG_TEXT.close}
            </Button>
            <Button onClick={handleSaveWeek} disabled={saving} className="hover:scale-105 transition-all duration-200">
              {saving ? PAGE_TEXT.loading : PAGE_TEXT.settingsSave}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={monthOpen} onOpenChange={(open) => { if (open) setMonthOpen(true); else void handleSaveMonth() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{PAGE_TEXT.settingsMonthTitle}</DialogTitle>
          </DialogHeader>
          <Editor value={monthDraft} onChange={setMonthDraft} minHeight="300px" />
          <SaveStatus status={monthAutoSave.status} onRetry={() => { void monthAutoSave.saveNow() }} />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => { void handleSaveMonth() }}
              className="hover:scale-105 transition-all duration-200"
            >
              {DIALOG_TEXT.close}
            </Button>
            <Button onClick={handleSaveMonth} disabled={saving} className="hover:scale-105 transition-all duration-200">
              {saving ? PAGE_TEXT.loading : PAGE_TEXT.settingsSave}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}

export default SettingsPage
