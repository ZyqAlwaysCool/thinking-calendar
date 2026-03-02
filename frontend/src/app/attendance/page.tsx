'use client'

import { useEffect, useMemo, useState } from 'react'
import { endOfMonth, format, isAfter, isSameMonth, parseISO, setDate, startOfMonth } from 'date-fns'
import { PageShell } from '@/components/page-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ATTENDANCE_OPTIONS, ATTENDANCE_TEXT, PAGE_TEXT } from '@/lib/constants'
import { cn, formatDateLabel, formatDateTime } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import { useAttendanceStore } from '@/stores/use-attendance-store'
import { type AttendanceSettings, type AttendanceType } from '@/types'

const AttendancePage = () => {
  const today = format(new Date(), 'yyyy-MM-dd')
  const currentMonth = format(new Date(), 'yyyy-MM')
  const minDate = format(startOfMonth(new Date()), 'yyyy-MM-dd')

  const [attendanceDate, setAttendanceDate] = useState(today)
  const [attendanceType, setAttendanceType] = useState<AttendanceType>('in')
  const [attendanceNote, setAttendanceNote] = useState('')
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
    if (!isEditing) return
    resetSettingsSaved()
  }, [attendanceSettings, isEditing, resetSettingsSaved])

  const dayOptions = useMemo(() => Array.from({ length: 31 }, (_, index) => String(index + 1)), [])
  const todayDate = parseISO(today)
  const attendanceLimit = summary.limit > 0 ? summary.limit : attendanceSettings.monthlyLimit
  const attendanceUsed = summary.used
  const usageRate =
    attendanceLimit > 0 ? Math.min(100, Math.round((attendanceUsed / attendanceLimit) * 100)) : 0
  const usageBarClass =
    usageRate >= 100 ? 'bg-red-500' : usageRate >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
  const usageTextClass =
    usageRate >= 100
      ? 'text-red-600 dark:text-red-400'
      : usageRate >= 80
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-emerald-600 dark:text-emerald-400'
  const attendanceStatusLocked = summary.locked
  const attendanceStatusText = attendanceStatusLocked
    ? ATTENDANCE_TEXT.statusLocked
    : ATTENDANCE_TEXT.statusOpen
  const attendanceHint = attendanceStatusLocked
    ? ATTENDANCE_TEXT.lockedHint
    : ATTENDANCE_TEXT.openHint
  const pushDayLabel = useMemo(() => {
    if (attendanceSettings.pushDay === 'last') return ATTENDANCE_TEXT.lastDayLabel
    const dayNumber = Number(attendanceSettings.pushDay)
    if (!Number.isFinite(dayNumber)) return ATTENDANCE_TEXT.lastDayLabel
    const monthEnd = endOfMonth(new Date())
    const targetDay = setDate(new Date(), dayNumber)
    if (isAfter(targetDay, monthEnd)) return ATTENDANCE_TEXT.lastDayLabel
    return `${dayNumber}${ATTENDANCE_TEXT.daySuffix}`
  }, [attendanceSettings.pushDay])
  const sortedAttendance = useMemo(
    () => [...records].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [records]
  )

  const handleAddAttendance = async () => {
    if (attendanceStatusLocked) {
      toast.error(ATTENDANCE_TEXT.lockedActionForbidden)
      return
    }
    if (!attendanceDate) {
      toast.error(ATTENDANCE_TEXT.dateRequired)
      return
    }
    const existingIndex = records.findIndex(
      item => item.date === attendanceDate && item.type === attendanceType
    )
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

  const usageText = `${attendanceUsed}/${attendanceLimit}${ATTENDANCE_TEXT.countUnit}`
  const pageLoading = loadingSettings || loadingRecords
  const settingsDisabled = !isEditing || savingSettings
  const pushStatusMap = {
    not_pushed: ATTENDANCE_TEXT.pushStatusNotPushed,
    pending: ATTENDANCE_TEXT.pushStatusPending,
    sent: ATTENDANCE_TEXT.pushStatusSent,
    failed: ATTENDANCE_TEXT.pushStatusFailed
  }
  const getPushStatusClassName = (status: string) => {
    if (status === 'sent') {
      return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300'
    }
    if (status === 'failed') {
      return 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300'
    }
    if (status === 'pending') {
      return 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300'
    }
    return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
  }

  const handleManualPush = async (month: string) => {
    try {
      await triggerManualPush(month)
      if (month === currentMonth) {
        await fetchRecords(currentMonth, true)
      }
    } catch {}
  }

  return (
    <PageShell>
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="text-3xl font-semibold text-gray-900 dark:text-gray-50">
            {ATTENDANCE_TEXT.pageTitle}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{ATTENDANCE_TEXT.pageSubtitle}</div>
        </div>

        {pageLoading ? (
          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <Card className="space-y-4 p-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-32" />
            </Card>
            <Card className="space-y-4 p-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-10 w-32" />
            </Card>
          </div>
        ) : (
          <>
            <div className="grid items-stretch gap-6 lg:grid-cols-[2fr,1fr]">
            <Card className="flex h-full flex-col gap-4 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                    {ATTENDANCE_TEXT.sectionTitle}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {ATTENDANCE_TEXT.sectionSubtitle}
                  </div>
                </div>
                <div
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium',
                    attendanceStatusLocked
                      ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300'
                      : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300'
                  )}
                >
                  {attendanceStatusText}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {ATTENDANCE_TEXT.usageLabel}
                    </div>
                    <div className={cn('text-2xl font-semibold', usageTextClass)}>
                      {attendanceUsed}
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {ATTENDANCE_TEXT.countUnit}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {ATTENDANCE_TEXT.limitLabel}
                    </div>
                    <div className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
                      {attendanceLimit}
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {ATTENDANCE_TEXT.countUnit}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{attendanceHint}</div>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800">
                  <div
                    className={cn('h-2 rounded-full transition-all duration-200', usageBarClass)}
                    style={{ width: `${usageRate}%` }}
                  />
                </div>
                <div className={cn('text-xs', usageTextClass)}>{usageText}</div>
              </div>

              <div className="space-y-3">
                <div className="grid gap-2 text-xs text-gray-500 dark:text-gray-400 sm:grid-cols-[160px,80px,1fr,80px]">
                  <div>{ATTENDANCE_TEXT.listHeaderDate}</div>
                  <div>{ATTENDANCE_TEXT.listHeaderType}</div>
                  <div>{ATTENDANCE_TEXT.listHeaderNote}</div>
                  <div className="text-left sm:text-right">{ATTENDANCE_TEXT.listHeaderAction}</div>
                </div>
                {sortedAttendance.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400 dark:border-gray-800 dark:text-gray-500">
                    {ATTENDANCE_TEXT.emptyRecords}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedAttendance.map(item => (
                      <div
                        key={item.id}
                        className="grid items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-200 sm:grid-cols-[160px,80px,1fr,80px]"
                      >
                        <div className="text-gray-900 dark:text-gray-50">{formatDateLabel(item.date)}</div>
                        <div>
                          {item.type === 'in' ? ATTENDANCE_TEXT.typeIn : ATTENDANCE_TEXT.typeOut}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          {item.note || ATTENDANCE_TEXT.noteEmpty}
                        </div>
                        <div className="flex justify-start sm:justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={attendanceStatusLocked || deletingRecord}
                            onClick={() => handleRemoveAttendance(item.id)}
                            className="text-red-500 hover:scale-105 hover:text-red-600 transition-all duration-200"
                          >
                            {ATTENDANCE_TEXT.actionDelete}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-800">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                  {ATTENDANCE_TEXT.addTitle}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{ATTENDANCE_TEXT.dateLabel}</Label>
                    <Input
                      type="date"
                      value={attendanceDate}
                      min={minDate}
                      max={today}
                      disabled={attendanceStatusLocked}
                      onChange={(event) => setAttendanceDate(event.target.value)}
                      className="hover:scale-105 transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{ATTENDANCE_TEXT.typeLabel}</Label>
                    <Select
                      value={attendanceType}
                      onValueChange={(value: AttendanceType) => setAttendanceType(value)}
                      disabled={attendanceStatusLocked}
                    >
                      <SelectTrigger className="hover:scale-105 transition-all duration-200">
                        <SelectValue placeholder={ATTENDANCE_TEXT.typePlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {ATTENDANCE_OPTIONS.types.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{ATTENDANCE_TEXT.noteLabel}</Label>
                  <Input
                    value={attendanceNote}
                    disabled={attendanceStatusLocked}
                    placeholder={ATTENDANCE_TEXT.notePlaceholder}
                    onChange={(event) => setAttendanceNote(event.target.value)}
                    className="hover:scale-105 transition-all duration-200"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddAttendance}
                    disabled={attendanceStatusLocked || savingRecord}
                    className="hover:scale-105 transition-all duration-200"
                  >
                    {savingRecord ? PAGE_TEXT.loading : ATTENDANCE_TEXT.addButton}
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="flex h-full flex-col gap-4 p-4">
              <div className="space-y-1">
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                  {ATTENDANCE_TEXT.settingsTitle}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {ATTENDANCE_TEXT.settingsSubtitle}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                  {ATTENDANCE_TEXT.scheduleTitle}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {ATTENDANCE_TEXT.scheduleSubtitle}
                </div>
                <div className="grid gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {ATTENDANCE_TEXT.pushDayLabel}
                    </span>
                    <span>{pushDayLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {ATTENDANCE_TEXT.pushTimeLabel}
                    </span>
                    <span>{attendanceSettings.pushTime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {ATTENDANCE_TEXT.pushRangeLabel}
                    </span>
                    <span>{ATTENDANCE_TEXT.rangeCurrent}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {ATTENDANCE_TEXT.pushEmailLabel}
                    </span>
                    <span className="truncate text-right">
                      {attendanceSettings.email || ATTENDANCE_TEXT.emailUnset}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>{ATTENDANCE_TEXT.limitSettingLabel}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={attendanceSettings.monthlyLimit}
                    disabled={settingsDisabled}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value)
                      setAttendanceSettings(prev => ({
                        ...prev,
                        monthlyLimit: Number.isFinite(nextValue) ? Math.max(0, nextValue) : 0
                      }))
                    }}
                    className="hover:scale-105 transition-all duration-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{ATTENDANCE_TEXT.pushDayLabel}</Label>
                  <Select
                    value={attendanceSettings.pushDay}
                    onValueChange={(value) =>
                      setAttendanceSettings(prev => ({
                        ...prev,
                        pushDay: value
                      }))
                    }
                    disabled={settingsDisabled}
                  >
                    <SelectTrigger className="hover:scale-105 transition-all duration-200">
                      <SelectValue placeholder={ATTENDANCE_TEXT.pushDayLabel} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[260px]">
                      <div className="space-y-2 p-2">
                        <SelectItem value="last">{ATTENDANCE_TEXT.lastDayLabel}</SelectItem>
                        <div className="grid grid-cols-7 gap-1">
                          {dayOptions.map(day => (
                            <SelectItem key={day} value={day} className="justify-center">
                              {day}
                              {ATTENDANCE_TEXT.daySuffix}
                            </SelectItem>
                          ))}
                        </div>
                      </div>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{ATTENDANCE_TEXT.pushTimeLabel}</Label>
                  <Input
                    type="time"
                    step={60}
                    value={attendanceSettings.pushTime}
                    disabled={settingsDisabled}
                    onChange={(event) =>
                      setAttendanceSettings(prev => ({
                        ...prev,
                        pushTime: event.target.value
                      }))
                    }
                    className="hover:scale-105 transition-all duration-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{ATTENDANCE_TEXT.pushEmailLabel}</Label>
                  <Input
                    value={attendanceSettings.email}
                    disabled={settingsDisabled}
                    placeholder={ATTENDANCE_TEXT.emailPlaceholder}
                    onChange={(event) => {
                      setAttendanceSettings(prev => ({
                        ...prev,
                        email: event.target.value
                      }))
                      if (emailError) setEmailError(false)
                    }}
                    className={cn(
                      'hover:scale-105 transition-all duration-200',
                      emailError && 'border-red-500 focus-visible:ring-red-500'
                    )}
                  />
                  {emailError ? (
                    <div className="text-xs text-red-600 dark:text-red-400">
                      {ATTENDANCE_TEXT.emailRequired}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {ATTENDANCE_TEXT.settingsHint}
                  </div>
                  {settingsSaved ? (
                    <div className="text-xs text-emerald-600 dark:text-emerald-400">
                      {ATTENDANCE_TEXT.settingsSavedHint}
                    </div>
                  ) : null}
                </div>
                <div className="flex justify-end">
                  {isEditing ? (
                    <Button
                      onClick={handleSaveSettings}
                      disabled={savingSettings}
                      className="hover:scale-105 transition-all duration-200"
                    >
                      {savingSettings ? PAGE_TEXT.loading : ATTENDANCE_TEXT.saveSettings}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={handleEditSettings}
                      className="hover:scale-105 transition-all duration-200"
                    >
                      {ATTENDANCE_TEXT.editSettings}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
            </div>

            <Card className="space-y-4 p-4">
              <div className="space-y-1">
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                  {ATTENDANCE_TEXT.historyTitle}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {ATTENDANCE_TEXT.historySubtitle}
                </div>
              </div>

              {loadingHistory ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : history.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400 dark:border-gray-800 dark:text-gray-500">
                  {ATTENDANCE_TEXT.historyEmpty}
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map(item => (
                    <div
                      key={item.month}
                      className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {ATTENDANCE_TEXT.monthLabel}
                          </div>
                          <div className="text-base font-semibold text-gray-900 dark:text-gray-50">
                            {item.month}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {ATTENDANCE_TEXT.monthUsageLabel}
                          </div>
                          <div className="text-base font-semibold text-gray-900 dark:text-gray-50">
                            {item.used}/{item.limit}
                            {ATTENDANCE_TEXT.countUnit}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {ATTENDANCE_TEXT.monthStatusLabel}
                          </div>
                          <div
                            className={cn(
                              'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
                              getPushStatusClassName(item.push_status)
                            )}
                          >
                            {pushStatusMap[item.push_status] || ATTENDANCE_TEXT.pushStatusNotPushed}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          disabled={pushingMonth === item.month}
                          onClick={() => handleManualPush(item.month)}
                          className="hover:scale-105 transition-all duration-200"
                        >
                          {pushingMonth === item.month ? ATTENDANCE_TEXT.pushingButton : ATTENDANCE_TEXT.pushNowButton}
                        </Button>
                      </div>

                      <div className="grid gap-2 text-sm text-gray-700 dark:text-gray-200 sm:grid-cols-3">
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {ATTENDANCE_TEXT.pushSendAtLabel}
                          </div>
                          <div>{item.send_at ? formatDateTime(item.send_at) : ATTENDANCE_TEXT.pushTimeEmpty}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {ATTENDANCE_TEXT.pushSentAtLabel}
                          </div>
                          <div>{item.sent_at ? formatDateTime(item.sent_at) : ATTENDANCE_TEXT.pushTimeEmpty}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {ATTENDANCE_TEXT.pushErrorLabel}
                          </div>
                          <div className="break-all">{item.error_msg || ATTENDANCE_TEXT.pushTimeEmpty}</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {ATTENDANCE_TEXT.monthRecordsLabel}
                        </div>
                        <div className="space-y-1">
                          {item.records.map(record => (
                            <div
                              key={record.id}
                              className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm text-gray-700 dark:bg-gray-950 dark:text-gray-200"
                            >
                              <div>{formatDateLabel(record.date)}</div>
                              <div>{record.type === 'in' ? ATTENDANCE_TEXT.typeIn : ATTENDANCE_TEXT.typeOut}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </PageShell>
  )
}

export default AttendancePage
