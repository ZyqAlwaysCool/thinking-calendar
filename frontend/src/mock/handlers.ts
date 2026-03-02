import { rest } from 'msw'
import { format, getISOWeek, parseISO } from 'date-fns'
import raw from './data.json'
import {
  type ApiResponse,
  type AttendancePushHistoryResp,
  type AttendancePushManualResp,
  type AttendanceRecord,
  type AttendanceRecordSaveResp,
  type AttendanceRecordsQueryResp,
  type AttendanceSettingsResponse,
  type Log,
  type Report
} from '@/types'

type RawLog = Log & { count?: number; version?: number }
type RawReport = Report & { updatedAt?: string }

const rawLogs = (raw.logs as RawLog[]) || []
const rawReports = (raw.reports as RawReport[]) || []
const rawAttendance = (raw.attendance as { settings?: AttendanceSettingsResponse; records?: AttendanceRecord[] }) || {}

let logs: Log[] = rawLogs.map((item) => ({
  ...item,
  version: item.version ?? item.count ?? 1
}))
let reports: Report[] = rawReports.map((item) => ({
  ...item,
  status: item.status ?? 'ready',
  template: item.template ?? 'formal',
  updatedAt: item.updatedAt ?? item.createdAt
}))
let attendanceSettings: AttendanceSettingsResponse = rawAttendance.settings ?? {
  monthly_limit: 8,
  push_day: 'last',
  push_time: '09:00',
  email: '',
  last_pushed_month: ''
}
let attendanceRecords: AttendanceRecord[] = rawAttendance.records ?? []
type AttendancePushMeta = {
  push_status: 'not_pushed' | 'pending' | 'sent' | 'failed'
  send_at: string
  sent_at: string
  error_msg: string
}
let attendancePushMetaByMonth: Record<string, AttendancePushMeta> = {}
if (attendanceSettings.last_pushed_month) {
  const now = new Date().toISOString()
  attendancePushMetaByMonth = {
    [attendanceSettings.last_pushed_month]: {
      push_status: 'sent',
      send_at: now,
      sent_at: now,
      error_msg: ''
    }
  }
}

const getAttendanceSummary = (month: string): AttendanceRecordsQueryResp['summary'] => {
  const list = attendanceRecords.filter(item => item.date.startsWith(month))
  return {
    used: list.length,
    limit: attendanceSettings.monthly_limit ?? 0,
    locked: attendanceSettings.last_pushed_month === month
  }
}

const buildAttendanceHistory = (): AttendancePushHistoryResp['list'] => {
  const monthMap = new Map<string, AttendanceRecord[]>()
  attendanceRecords.forEach(record => {
    const month = record.date.slice(0, 7)
    const list = monthMap.get(month) || []
    list.push(record)
    monthMap.set(month, list)
  })

  return Array.from(monthMap.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([month, records]) => {
      const sortedRecords = [...records].sort((a, b) => (a.date < b.date ? -1 : 1))
      const pushMeta = attendancePushMetaByMonth[month] || {
        push_status: 'not_pushed',
        send_at: '',
        sent_at: '',
        error_msg: ''
      }
      return {
        month,
        used: records.length,
        limit: attendanceSettings.monthly_limit,
        push_status: pushMeta.push_status,
        send_at: pushMeta.send_at,
        sent_at: pushMeta.sent_at,
        error_msg: pushMeta.error_msg,
        records: sortedRecords
      }
    })
}

export const handlers = [
  rest.get('/api/logs', (req, res, ctx) => {
    const date = req.url.searchParams.get('date')
    if (date) {
      const found = logs.find(item => item.date === date)
      const response: ApiResponse<Log | null> = { code: 0, msg: 'success', data: found ?? null }
      return res(ctx.status(200), ctx.json(response))
    }
    const response: ApiResponse<Log[]> = { code: 0, msg: 'success', data: logs }
    return res(ctx.status(200), ctx.json(response))
  }),
  rest.post('/api/logs', async (req, res, ctx) => {
    const body = await req.json()
    const { date, content } = body as { date: string; content: string }
    const existing = logs.find(item => item.date === date)
    const now = new Date()
    if (existing) {
      existing.content = content
      existing.updatedAt = now.toISOString()
      existing.version = existing.version + 1
      const response: ApiResponse<Log> = { code: 0, msg: 'success', data: existing }
      return res(ctx.status(200), ctx.json(response))
    }
    const created: Log = {
      id: String(logs.length + 1),
      date,
      content,
      updatedAt: now.toISOString(),
      version: 1
    }
    logs = [...logs, created]
    const response: ApiResponse<Log> = { code: 0, msg: 'success', data: created }
    return res(ctx.status(200), ctx.json(response))
  }),
  rest.get('/api/reports', (_req, res, ctx) => {
    const response: ApiResponse<Report[]> = { code: 0, msg: 'success', data: reports }
    return res(ctx.status(200), ctx.json(response))
  }),
  rest.get('/api/reports/recent', (_req, res, ctx) => {
    const sorted = [...reports].sort((a, b) => (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    const response: ApiResponse<Report[]> = { code: 0, msg: 'success', data: sorted.slice(0, 5) }
    return res(ctx.status(200), ctx.json(response))
  }),
  rest.post('/api/reports/generate', async (req, res, ctx) => {
    const body = await req.json()
    const { period, startDate, endDate, template, replaceId } = body as {
      period: Report['period']
      startDate: string
      endDate: string
      template: 'formal' | 'simple'
      replaceId?: string
    }
    const now = new Date()
    const existing = replaceId ? reports.find(item => item.id === replaceId) : undefined
    const finalId = replaceId ?? `r${now.getTime()}`
    const computedWeek = getISOWeek(parseISO(startDate))
    const startLabel = format(parseISO(startDate), 'yyyy年MM月dd日')
    const endLabel = format(parseISO(endDate), 'MM月dd日')
    const title =
      period === 'week'
        ? `${startLabel}-${endLabel} 周报`
        : period === 'month'
          ? `${startDate.slice(0, 7).replace('-', '年')}月报`
          : `${startDate.slice(0, 4)}年度总结`
    const content = [
      `# ${template === 'formal' ? '正式版' : '简约版'}${period === 'year' ? '年终总结' : '报告'}`,
      '- 核心产出：保持进展与质量',
      '- 风险与阻碍：已给出应对方案',
      '- 下阶段计划：按优先级推进'
    ].join('\\n')
    const createdAt = replaceId ? now.toISOString() : existing?.createdAt ?? now.toISOString()
    const created: Report = {
      id: finalId,
      period,
      startDate,
      endDate,
      title,
      content,
      confirmed: replaceId ? false : existing?.confirmed ?? false,
      createdAt,
      updatedAt: now.toISOString(),
      status: 'ready',
      template
    }
    if (existing) {
      reports = reports.map(item => (item.id === finalId ? created : item))
    } else {
      reports = [created, ...reports]
    }
    const response: ApiResponse<Report> = { code: 0, msg: 'success', data: created }
    return res(ctx.status(200), ctx.json(response))
  }),
  rest.post('/api/reports/confirm', async (req, res, ctx) => {
    const body = await req.json()
    const { id } = body as { id: string }
    const found = reports.find(item => item.id === id)
    if (found) {
      found.confirmed = true
      const response: ApiResponse<Report> = { code: 0, msg: 'success', data: found }
      return res(ctx.status(200), ctx.json(response))
    }
    const response: ApiResponse<null> = { code: 0, msg: 'not found', data: null }
    return res(ctx.status(404), ctx.json(response))
  }),
  rest.post('/api/attendance/settings/get', (_req, res, ctx) => {
    const response: ApiResponse<AttendanceSettingsResponse> = {
      code: 0,
      msg: 'success',
      data: attendanceSettings
    }
    return res(ctx.status(200), ctx.json(response))
  }),
  rest.post('/api/attendance/settings/save', async (req, res, ctx) => {
    const body = await req.json()
    const payload = body as {
      monthly_limit: number
      push_day: string
      push_time: string
      email: string
    }
    attendanceSettings = {
      ...attendanceSettings,
      monthly_limit: payload.monthly_limit,
      push_day: payload.push_day,
      push_time: payload.push_time,
      email: payload.email
    }
    const response: ApiResponse<{ saved: boolean }> = { code: 0, msg: 'success', data: { saved: true } }
    return res(ctx.status(200), ctx.json(response))
  }),
  rest.post('/api/attendance/records/query', async (req, res, ctx) => {
    const body = await req.json()
    const month = (body as { month?: string }).month || format(new Date(), 'yyyy-MM')
    const records = attendanceRecords.filter(item => item.date.startsWith(month))
    const response: ApiResponse<AttendanceRecordsQueryResp> = {
      code: 0,
      msg: 'success',
      data: {
        records,
        summary: getAttendanceSummary(month)
      }
    }
    return res(ctx.status(200), ctx.json(response))
  }),
  rest.post('/api/attendance/records/save', async (req, res, ctx) => {
    const body = await req.json()
    const payload = body as { date: string; type: 'in' | 'out'; note?: string }
    const existing = attendanceRecords.find(
      item => item.date === payload.date && item.type === payload.type
    )
    let recordId = ''
    let updated = false
    if (existing) {
      existing.note = payload.note ?? ''
      recordId = existing.id
      updated = true
    } else {
      recordId = `attrec_${Date.now()}`
      const created: AttendanceRecord = {
        id: recordId,
        date: payload.date,
        type: payload.type,
        note: payload.note ?? ''
      }
      attendanceRecords = [created, ...attendanceRecords]
    }
    const response: ApiResponse<AttendanceRecordSaveResp> = {
      code: 0,
      msg: 'success',
      data: { id: recordId, updated }
    }
    return res(ctx.status(200), ctx.json(response))
  }),
  rest.post('/api/attendance/records/delete', async (req, res, ctx) => {
    const body = await req.json()
    const { id } = body as { id: string }
    attendanceRecords = attendanceRecords.filter(item => item.id !== id)
    const response: ApiResponse<{ deleted: boolean }> = {
      code: 0,
      msg: 'success',
      data: { deleted: true }
    }
    return res(ctx.status(200), ctx.json(response))
  }),
  rest.post('/api/attendance/push/history', (_req, res, ctx) => {
    const response: ApiResponse<AttendancePushHistoryResp> = {
      code: 0,
      msg: 'success',
      data: {
        list: buildAttendanceHistory()
      }
    }
    return res(ctx.status(200), ctx.json(response))
  }),
  rest.post('/api/attendance/push/manual', async (req, res, ctx) => {
    const body = await req.json()
    const month = ((body as { month?: string }).month || '').trim()
    if (!month) {
      const response: ApiResponse<null> = { code: 400, msg: '请求参数错误', data: null }
      return res(ctx.status(400), ctx.json(response))
    }
    const hasRecords = attendanceRecords.some(item => item.date.startsWith(month))
    if (!hasRecords) {
      const response: ApiResponse<null> = { code: 5011, msg: '补卡记录为空，无法推送', data: null }
      return res(ctx.status(400), ctx.json(response))
    }
    const now = new Date().toISOString()
    attendancePushMetaByMonth[month] = {
      push_status: 'sent',
      send_at: now,
      sent_at: now,
      error_msg: ''
    }
    if (month === format(new Date(), 'yyyy-MM')) {
      attendanceSettings = {
        ...attendanceSettings,
        last_pushed_month: month
      }
    }
    const response: ApiResponse<AttendancePushManualResp> = {
      code: 0,
      msg: 'success',
      data: {
        triggered: true,
        mail_id: `mail_${Date.now()}`
      }
    }
    return res(ctx.status(200), ctx.json(response))
  })
]
