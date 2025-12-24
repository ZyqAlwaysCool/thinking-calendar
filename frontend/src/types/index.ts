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

export type LoginRespData = {
  access_token?: string
  expire_at?: string
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
