'use client'

import { useEffect, useMemo, useState } from 'react'
import { endOfMonth, format, isAfter, isSameMonth, parseISO, setDate, startOfMonth } from 'date-fns'
import { PageShell } from '@/components/page-shell'
import { PageHeader } from '@/components/page-header'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ATTENDANCE_OPTIONS, ATTENDANCE_TEXT, DIALOG_TEXT, PAGE_TEXT } from '@/lib/constants'
import { cn, formatDateLabel, formatDateTime } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import { useAttendanceStore } from '@/stores/use-attendance-store'
import { type AttendanceSettings, type AttendanceType } from '@/types'
import { Mail, Plus, Send, Settings2, Trash2 } from 'lucide-react'

type AttendanceTab = 'records' | 'settings' | 'history'

const AttendancePage = () => {
  const today = format(new Date(), 'yyyy-MM-dd')
  const currentMonth = format(new Date(), 'yyyy-MM')
  const minDate = format(startOfMonth(new Date()), 'yyyy-MM-dd')

  const [activeTab, setActiveTab] = useState<AttendanceTab>('records')
  const [addOpen, setAddOpen] = useState(false)
  const [attendanceDate, setAttendanceDate] = useState(today)
  const [attendanceType, setAttendanceType] = useState<AttendanceType>('in')
  const [attendanceNote, setAttendanceNote] = useState('')
  const [pushTarget, setPushTarget] = useState<string | null>(null)
  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettings>({
    monthlyLimit: 8,
    pushDay: 'last',
    pushTime: '09:00',
    email: '',
    lastPushedMonth: ''
  })
  const [emailError, setEmailError] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  const {
    settings,
    records,
    summary,
    loadingSettings,
    loadingRecords,
    loadingHistory,
    savingSettings,
    savingRecord,
    deletingRecord,
    pushingMonth,
    isEditing,
    history,
    settingsSaved,
    fetchSettings,
    fetchRecords,
    fetchHistory,
    triggerManualPush,
    saveSettings,
    saveRecord,
    deleteRecord,
    setEditing,
    resetSettingsSaved
  } = useAttendanceStore()

  useEffect(() => {
    const load = async () => {
      try {
        await fetchSettings()
        await fetchRecords(currentMonth)
        await fetchHistory()
      } catch {}
    }
    void load()
  }, [fetchSettings, fetchRecords, fetchHistory, currentMonth])

  useEffect(() => {
    if (loadingSettings) return
    if (!settingsLoaded || !isEditing) {
      setAttendanceSettings(settings)
      setSettingsLoaded(true)
    }
  }, [settings, isEditing, settingsLoaded, loadingSettings])

  useEffect(() => {
    if (isEditing) resetSettingsSaved()
  }, [attendanceSettings, isEditing, resetSettingsSaved])

  const dayOptions = useMemo(() => Array.from({ length: 31 }, (_, index) => String(index + 1)), [])
  const todayDate = parseISO(today)
  const attendanceLimit = summary.limit > 0 ? summary.limit : attendanceSettings.monthlyLimit
  const attendanceUsed = summary.used
  const usageRate = attendanceLimit > 0 ? Math.min(100, Math.round((attendanceUsed / attendanceLimit) * 100)) : 0
  const attendanceStatusLocked = summary.locked
  const sortedAttendance = useMemo(() => [...records].sort((a, b) => (a.date < b.date ? 1 : -1)), [records])
  const selectedPush = history.find(item => item.month === pushTarget)

  const pushDayLabel = useMemo(() => {
    if (attendanceSettings.pushDay === 'last') return ATTENDANCE_TEXT.lastDayLabel
    const dayNumber = Number(attendanceSettings.pushDay)
    if (!Number.isFinite(dayNumber)) return ATTENDANCE_TEXT.lastDayLabel
    const monthEnd = endOfMonth(new Date())
    const targetDay = setDate(new Date(), dayNumber)
    if (isAfter(targetDay, monthEnd)) return ATTENDANCE_TEXT.lastDayLabel
    return `${dayNumber}${ATTENDANCE_TEXT.daySuffix}`
  }, [attendanceSettings.pushDay])

  const handleAddAttendance = async () => {
    if (attendanceStatusLocked) {
      toast.error(ATTENDANCE_TEXT.lockedActionForbidden)
      return
    }
    if (!attendanceDate) {
      toast.error(ATTENDANCE_TEXT.dateRequired)
      return
    }
    const existingIndex = records.findIndex(item => item.date === attendanceDate && item.type === attendanceType)
    if (existingIndex === -1 && attendanceUsed >= attendanceLimit) {
      toast.error(ATTENDANCE_TEXT.limitReached)
      return
    }
    const selected = parseISO(attendanceDate)
    if (!isSameMonth(selected, todayDate)) {
      toast.error(ATTENDANCE_TEXT.crossMonthForbidden)
      return
    }
    if (isAfter(selected, todayDate)) {
      toast.error(ATTENDANCE_TEXT.futureDateForbidden)
      return
    }
    try {
      const saved = await saveRecord({
        date: attendanceDate,
        type: attendanceType,
        note: attendanceNote.trim()
      })
      if (saved) {
        setAttendanceNote('')
        setAddOpen(false)
      }
    } catch {}
  }

  const handleRemoveAttendance = async (id: string) => {
    if (attendanceStatusLocked) {
      toast.error(ATTENDANCE_TEXT.lockedActionForbidden)
      return
    }
    try {
      await deleteRecord(id)
    } catch {}
  }

  const handleSaveSettings = async () => {
    const trimmedEmail = attendanceSettings.email.trim()
    if (!trimmedEmail) {
      setEmailError(true)
      return
    }
    setEmailError(false)
    try {
      await saveSettings({
        monthlyLimit: attendanceSettings.monthlyLimit,
        pushDay: attendanceSettings.pushDay,
        pushTime: attendanceSettings.pushTime,
        email: trimmedEmail
      })
    } catch {}
  }

  const handleEditSettings = () => {
    setEditing(true)
    setEmailError(false)
    resetSettingsSaved()
  }

  const handleManualPush = async (month: string) => {
    try {
      const triggered = await triggerManualPush(month)
      if (!triggered) return
      if (month === currentMonth) await fetchRecords(currentMonth, true)
      setPushTarget(null)
    } catch {}
  }

  const pushStatusMap = {
    not_pushed: ATTENDANCE_TEXT.pushStatusNotPushed,
    pending: ATTENDANCE_TEXT.pushStatusPending,
    sent: ATTENDANCE_TEXT.pushStatusSent,
    failed: ATTENDANCE_TEXT.pushStatusFailed
  }

  const pushStatusClass = (status: string) => {
    if (status === 'sent') return 'bg-emerald-500'
    if (status === 'failed') return 'bg-red-500'
    if (status === 'pending') return 'bg-amber-500'
    return 'bg-gray-400'
  }

  const tabs: Array<{ value: AttendanceTab; label: string }> = [
    { value: 'records', label: '本月记录' },
    { value: 'settings', label: '推送设置' },
    { value: 'history', label: '推送历史' }
  ]

  const pageLoading = loadingSettings || loadingRecords

  return (
    <PageShell>
      <PageHeader
        eyebrow="工具"
        title="补卡"
        description="记录本月需要补卡的日期，并按设置时间发送汇总提醒。"
        action={
          activeTab === 'records' ? (
            <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)} disabled={attendanceStatusLocked}>
              <Plus className="h-4 w-4" />
              新增补卡
            </Button>
          ) : null
        }
      />

      <div className="mb-8 flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {tabs.map(tab => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              '-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors duration-150',
              activeTab === tab.value
                ? 'border-gray-900 text-gray-950 dark:border-gray-100 dark:text-gray-50'
                : 'border-transparent text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {pageLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : null}

      {!pageLoading && activeTab === 'records' ? (
        <div className="space-y-8">
          <section className="grid divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="px-1 py-5 sm:px-6">
              <div className="text-xs text-gray-400">本月已用</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-gray-950 dark:text-gray-50">
                {attendanceUsed}
                <span className="ml-1 text-sm font-normal text-gray-400">/ {attendanceLimit} 次</span>
              </div>
            </div>
            <div className="px-1 py-5 sm:px-6">
              <div className="text-xs text-gray-400">使用进度</div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-900">
                <div className="h-full rounded-full bg-gray-900 dark:bg-gray-100" style={{ width: `${usageRate}%` }} />
              </div>
              <div className="mt-2 text-xs text-gray-400">{usageRate}%</div>
            </div>
            <div className="px-1 py-5 sm:px-6">
              <div className="text-xs text-gray-400">当前状态</div>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                <span className={cn('h-2 w-2 rounded-full', attendanceStatusLocked ? 'bg-gray-400' : 'bg-emerald-500')} />
                {attendanceStatusLocked ? ATTENDANCE_TEXT.statusLocked : ATTENDANCE_TEXT.statusOpen}
              </div>
              <div className="mt-1 text-xs text-gray-400">
                {attendanceStatusLocked ? ATTENDANCE_TEXT.lockedHint : ATTENDANCE_TEXT.openHint}
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">本月补卡记录</h2>
                <p className="mt-1 text-xs text-gray-400">{sortedAttendance.length} 条</p>
              </div>
            </div>

            {sortedAttendance.length === 0 ? (
              <div className="border-y border-dashed border-gray-200 py-16 text-center text-sm text-gray-400 dark:border-gray-800">
                {ATTENDANCE_TEXT.emptyRecords}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">
                {sortedAttendance.map(item => (
                  <div key={item.id} className="grid items-center gap-3 py-4 sm:grid-cols-[150px_90px_minmax(0,1fr)_44px] sm:px-2">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatDateLabel(item.date)}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {item.type === 'in' ? ATTENDANCE_TEXT.typeIn : ATTENDANCE_TEXT.typeOut}
                    </div>
                    <div className="truncate text-sm text-gray-500 dark:text-gray-400">{item.note || ATTENDANCE_TEXT.noteEmpty}</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 dark:text-gray-600 dark:hover:text-red-400"
                      disabled={attendanceStatusLocked || deletingRecord}
                      onClick={() => { void handleRemoveAttendance(item.id) }}
                      aria-label={ATTENDANCE_TEXT.actionDelete}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {!pageLoading && activeTab === 'settings' ? (
        <div className="mx-auto max-w-[760px]">
          <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 text-gray-400" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">当前推送计划</div>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-gray-400">{ATTENDANCE_TEXT.pushDayLabel}</div>
                    <div className="mt-1 text-gray-700 dark:text-gray-300">{pushDayLabel} {attendanceSettings.pushTime}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">{ATTENDANCE_TEXT.pushEmailLabel}</div>
                    <div className="mt-1 truncate text-gray-700 dark:text-gray-300">{attendanceSettings.email || ATTENDANCE_TEXT.emailUnset}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">补卡与提醒设置</h2>
                <p className="mt-1 text-xs text-gray-400">{ATTENDANCE_TEXT.settingsHint}</p>
              </div>
              {!isEditing ? (
                <Button variant="outline" size="sm" className="gap-2" onClick={handleEditSettings}>
                  <Settings2 className="h-4 w-4" />
                  {ATTENDANCE_TEXT.editSettings}
                </Button>
              ) : null}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label>{ATTENDANCE_TEXT.limitSettingLabel}</Label>
                <Input
                  type="number"
                  min={0}
                  value={attendanceSettings.monthlyLimit}
                  disabled={!isEditing || savingSettings}
                  onChange={event => {
                    const nextValue = Number(event.target.value)
                    setAttendanceSettings(prev => ({
                      ...prev,
                      monthlyLimit: Number.isFinite(nextValue) ? Math.max(0, nextValue) : 0
                    }))
                  }}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>{ATTENDANCE_TEXT.pushDayLabel}</Label>
                <Select
                  value={attendanceSettings.pushDay}
                  onValueChange={value => setAttendanceSettings(prev => ({ ...prev, pushDay: value }))}
                  disabled={!isEditing || savingSettings}
                >
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-[280px]">
                    <SelectItem value="last">{ATTENDANCE_TEXT.lastDayLabel}</SelectItem>
                    {dayOptions.map(day => (
                      <SelectItem key={day} value={day}>{day}{ATTENDANCE_TEXT.daySuffix}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{ATTENDANCE_TEXT.pushTimeLabel}</Label>
                <Input
                  type="time"
                  step={60}
                  value={attendanceSettings.pushTime}
                  disabled={!isEditing || savingSettings}
                  onChange={event => setAttendanceSettings(prev => ({ ...prev, pushTime: event.target.value }))}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>{ATTENDANCE_TEXT.pushEmailLabel}</Label>
                <Input
                  value={attendanceSettings.email}
                  disabled={!isEditing || savingSettings}
                  placeholder={ATTENDANCE_TEXT.emailPlaceholder}
                  onChange={event => {
                    setAttendanceSettings(prev => ({ ...prev, email: event.target.value }))
                    if (emailError) setEmailError(false)
                  }}
                  className={cn('mt-2', emailError && 'border-red-400 focus-visible:ring-red-100')}
                />
                {emailError ? <div className="mt-2 text-xs text-red-600">{ATTENDANCE_TEXT.emailRequired}</div> : null}
              </div>
            </div>

            {isEditing ? (
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-800">
                {settingsSaved ? <span className="mr-auto text-xs text-gray-400">{ATTENDANCE_TEXT.settingsSavedHint}</span> : null}
                <Button onClick={() => { void handleSaveSettings() }} disabled={savingSettings}>
                  {savingSettings ? PAGE_TEXT.loading : ATTENDANCE_TEXT.saveSettings}
                </Button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {!pageLoading && activeTab === 'history' ? (
        <section>
          {loadingHistory ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : history.length === 0 ? (
            <div className="border-y border-dashed border-gray-200 py-16 text-center text-sm text-gray-400 dark:border-gray-800">
              {ATTENDANCE_TEXT.historyEmpty}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">
              {history.map(item => (
                <details key={item.month} className="group">
                  <summary className="grid cursor-pointer list-none items-center gap-3 py-4 sm:grid-cols-[120px_110px_minmax(0,1fr)_110px] sm:px-2">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.month}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{item.used}/{item.limit} 次</div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className={cn('h-2 w-2 rounded-full', pushStatusClass(item.push_status))} />
                      {pushStatusMap[item.push_status] || ATTENDANCE_TEXT.pushStatusNotPushed}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pushingMonth === item.month}
                      onClick={event => {
                        event.preventDefault()
                        setPushTarget(item.month)
                      }}
                    >
                      {pushingMonth === item.month ? ATTENDANCE_TEXT.pushingButton : ATTENDANCE_TEXT.pushNowButton}
                    </Button>
                  </summary>

                  <div className="pb-5 pl-2 pr-2">
                    <div className="grid gap-4 rounded-xl bg-gray-50 p-4 text-sm dark:bg-gray-900/50 sm:grid-cols-3">
                      <div>
                        <div className="text-xs text-gray-400">{ATTENDANCE_TEXT.pushSendAtLabel}</div>
                        <div className="mt-1 text-gray-700 dark:text-gray-300">{item.send_at ? formatDateTime(item.send_at) : ATTENDANCE_TEXT.pushTimeEmpty}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">{ATTENDANCE_TEXT.pushSentAtLabel}</div>
                        <div className="mt-1 text-gray-700 dark:text-gray-300">{item.sent_at ? formatDateTime(item.sent_at) : ATTENDANCE_TEXT.pushTimeEmpty}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">{ATTENDANCE_TEXT.pushErrorLabel}</div>
                        <div className="mt-1 break-all text-gray-700 dark:text-gray-300">{item.error_msg || ATTENDANCE_TEXT.pushTimeEmpty}</div>
                      </div>
                    </div>

                    {item.records.length > 0 ? (
                      <div className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-gray-900 dark:border-gray-800 dark:bg-gray-950">
                        {item.records.map(record => (
                          <div key={record.id} className="flex items-center justify-between px-4 py-3 text-sm">
                            <span className="text-gray-700 dark:text-gray-300">{formatDateLabel(record.date)}</span>
                            <span className="text-gray-400">{record.type === 'in' ? ATTENDANCE_TEXT.typeIn : ATTENDANCE_TEXT.typeOut}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{ATTENDANCE_TEXT.addTitle}</DialogTitle></DialogHeader>
          <div className="mt-3 space-y-4">
            <div>
              <Label>{ATTENDANCE_TEXT.dateLabel}</Label>
              <Input
                type="date"
                value={attendanceDate}
                min={minDate}
                max={today}
                disabled={attendanceStatusLocked}
                onChange={event => setAttendanceDate(event.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label>{ATTENDANCE_TEXT.typeLabel}</Label>
              <Select value={attendanceType} onValueChange={(value: AttendanceType) => setAttendanceType(value)} disabled={attendanceStatusLocked}>
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ATTENDANCE_OPTIONS.types.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{ATTENDANCE_TEXT.noteLabel}</Label>
              <Input
                value={attendanceNote}
                disabled={attendanceStatusLocked}
                placeholder={ATTENDANCE_TEXT.notePlaceholder}
                onChange={event => setAttendanceNote(event.target.value)}
                className="mt-2"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>{DIALOG_TEXT.close}</Button>
              <Button onClick={() => { void handleAddAttendance() }} disabled={attendanceStatusLocked || savingRecord}>
                {savingRecord ? PAGE_TEXT.loading : ATTENDANCE_TEXT.addButton}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pushTarget} onOpenChange={open => { if (!open) setPushTarget(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{ATTENDANCE_TEXT.pushConfirmTitle}</DialogTitle></DialogHeader>
          <div className="mt-3 space-y-3 rounded-xl bg-gray-50 p-4 text-sm dark:bg-gray-900/50">
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400">{ATTENDANCE_TEXT.pushConfirmMonth}</span>
              <span className="text-gray-800 dark:text-gray-200">{selectedPush?.month}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400">{ATTENDANCE_TEXT.pushConfirmCount}</span>
              <span className="text-gray-800 dark:text-gray-200">{selectedPush?.records.length ?? 0}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400">{ATTENDANCE_TEXT.pushConfirmEmail}</span>
              <span className="truncate text-gray-800 dark:text-gray-200">{settings.email || ATTENDANCE_TEXT.emailUnset}</span>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setPushTarget(null)}>{DIALOG_TEXT.close}</Button>
            <Button
              className="gap-2"
              disabled={!pushTarget || !settings.email || pushingMonth === pushTarget}
              onClick={() => { if (pushTarget) void handleManualPush(pushTarget) }}
            >
              <Send className="h-4 w-4" />
              {ATTENDANCE_TEXT.pushConfirmAction}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}

export default AttendancePage
