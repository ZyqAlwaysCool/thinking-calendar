export type User = {
  userId: string
  username: string
  avatar?: string
  isValid: boolean
  lastLoginAt: string
}

export type Log = {
  id: string
  date: string
  content: string
  updatedAt: string
  version: number
}

export type ReportPeriod = 'week' | 'month' | 'year'

export type Report = {
  id: string
  period: ReportPeriod
  startDate: string
  endDate: string
  title: string
  content: string
  confirmed: boolean
  createdAt: string
  updatedAt: string
  status: 'queued' | 'processing' | 'ready' | 'failed'
  template: 'formal' | 'simple'
  failedReason?: string
}

export type AttendanceType = 'in' | 'out'

export type AttendanceRecord = {
  id: string
  date: string
  type: AttendanceType
  note: string
}

export type AttendanceSettings = {
  monthlyLimit: number
  pushDay: string
  pushTime: string
  email: string
  lastPushedMonth: string
}

export type AttendanceSummary = {
  used: number
  limit: number
  locked: boolean
}

export type AttendanceSettingsResponse = {
  monthly_limit: number
  push_day: string
  push_time: string
  email: string
  last_pushed_month: string
}

export type AttendanceSettingsSavePayload = {
  monthlyLimit: number
  pushDay: string
  pushTime: string
  email: string
}

export type AttendanceRecordsQueryResp = {
  records: AttendanceRecord[]
  summary: AttendanceSummary
}

export type AttendanceRecordSavePayload = {
  date: string
  type: AttendanceType
  note: string
}

export type AttendanceRecordSaveResp = {
  id: string
  updated: boolean
}

export type AttendancePushStatus = 'not_pushed' | 'pending' | 'sent' | 'failed'

export type AttendancePushHistoryItem = {
  month: string
  used: number
  limit: number
  push_status: AttendancePushStatus
  send_at: string
  sent_at: string
  error_msg: string
  records: AttendanceRecord[]
}

export type AttendancePushHistoryResp = {
  list: AttendancePushHistoryItem[]
}

export type AttendancePushManualPayload = {
  month: string
}

export type AttendancePushManualResp = {
  triggered: boolean
  mail_id: string
}

export type ApiResponse<T> = {
  code: number
  msg: string
  data: T
}

export type GenerateReportPayload = {
  period: ReportPeriod
  startDate: string
  endDate: string
  template: 'formal' | 'simple'
}

export type SaveLogPayload = {
  date: string
  content: string
  meta?: Record<string, unknown>
}

export type ConfirmReportPayload = {
  reportId: string
  content?: string
}

export type RefineReportPayload = {
  reportId: string
  feedback: string
}

export type LoginRespData = {
  access_token?: string
  expire_at?: string
  refresh_token?: string
  refresh_expire_at?: string
  accessToken?: string
  expireAt?: string
}

export type MonthDay = {
  date: string
  hasRecord: boolean
}

export type MonthDashboard = {
  recordedDays: number
  missingDays: number
  rate: number
  days: MonthDay[]
}

export type UserSettings = {
  userId: string
  reportTemplateWeek: string
  reportTemplateMonth: string
  autoGenerateWeekly: boolean
  weeklyReportTime: string
}

export type AutoSaveStatus = 'saved' | 'pending' | 'saving' | 'error' | 'empty'

export type ReportFilter = 'all' | 'pending' | 'confirmed' | 'generating' | 'failed'

export type ConfirmDeleteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}
