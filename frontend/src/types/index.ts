export type User = {
  id: string
  name: string
  email: string
}

export type Log = {
  id: string
  date: string
  content: string
  updatedAt: string
  count: number
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
}

export type ConfirmReportPayload = {
  id: string
}
