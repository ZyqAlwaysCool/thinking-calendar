import { rest } from 'msw'
import { format, parseISO } from 'date-fns'
import raw from './data.json'
import {
  type ApiResponse,
  type AttendancePushHistoryResp,
  type AttendancePushManualResp,
  type AttendanceRecord,
  type AttendanceRecordSaveResp,
  type AttendanceRecordsQueryResp,
  type AttendanceSettingsResponse,
  type Report
} from '@/types'

// ---- mock 内存数据 ----
type RawLog = { id: string; date: string; content: string; updatedAt: string; count?: number; version?: number }
type RawReport = { id: string; period: Report['period']; startDate: string; endDate: string; title: string; content: string; confirmed: boolean; createdAt: string; updatedAt?: string; template?: 'formal' | 'simple'; status?: Report['status'] }

const rawLogs = (raw.logs as RawLog[]) || []
const rawReports = (raw.reports as RawReport[]) || []
const rawAttendance = (raw.attendance as { settings?: AttendanceSettingsResponse; records?: AttendanceRecord[] }) || {}

let logs: RawLog[] = rawLogs.map((item) => ({
  ...item,
  version: item.version ?? item.count ?? 1
}))

let reports: RawReport[] = rawReports.map((item) => ({
  ...item,
  updatedAt: item.updatedAt ?? item.createdAt
}))

let userSettings = {
  user_id: 'userid_mock001',
  report_template_week: '',
  report_template_month: '',
  auto_generate_weekly: false,
  weekly_report_time: ''
}

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

// ---- 辅助函数 ----
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
        push_status: 'not_pushed' as const,
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

// 将内存 log 转为后端 RecordItem 响应格式
const toRecordResp = (item: RawLog) => ({
  record_id: item.id,
  date: item.date,
  content: item.content,
  updatedAt: item.updatedAt,
  version: item.version ?? 1
})

// 将内存 report 转为后端 ReportItem 响应格式
const toReportResp = (item: RawReport) => ({
  report_id: item.id,
  period_type: item.period,
  start_date: item.startDate,
  end_date: item.endDate,
  title: item.title,
  content: item.content,
  confirmed: item.confirmed,
  template: item.template ?? 'formal',
  status: item.status ?? 'ready',
  created_at: item.createdAt,
  updated_at: item.updatedAt ?? item.createdAt
})

// ---- handlers ----
export const handlers = [
  // ========== 用户模块 ==========
  rest.post('/api/register', async (req, res, ctx) => {
    const body = await req.json()
    const { username, password } = body as { username: string; password: string }
    if (!username || !password) {
      const resp: ApiResponse<null> = { code: 400, msg: '请求参数错误', data: null }
      return res(ctx.status(400), ctx.json(resp))
    }
    const resp: ApiResponse<null> = { code: 0, msg: 'ok', data: null }
    return res(ctx.status(200), ctx.json(resp))
  }),

  rest.post('/api/login', async (req, res, ctx) => {
    const body = await req.json()
    const { username, password } = body as { username: string; password: string }
    if (!username || !password) {
      const resp: ApiResponse<null> = { code: 400, msg: '请求参数错误', data: null }
      return res(ctx.status(400), ctx.json(resp))
    }
    // mock 返回：用户名不存在视为注册场景，统一返回成功
    const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const refreshExpireAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const resp: ApiResponse<{ access_token: string; expire_at: string; refresh_token: string; refresh_expire_at: string }> = {
      code: 0,
      msg: 'ok',
      data: {
        access_token: 'mock_jwt_token_' + Date.now(),
        expire_at: expireAt,
        refresh_token: 'mock_refresh_token_' + Date.now(),
        refresh_expire_at: refreshExpireAt
      }
    }
    return res(ctx.status(200), ctx.json(resp))
  }),

  rest.get('/api/user', (_req, res, ctx) => {
    const resp: ApiResponse<{
      user_id: string
      username: string
      avatar: string
      is_valid: boolean
      last_login_at: string
    }> = {
      code: 0,
      msg: 'ok',
      data: {
        user_id: 'userid_mock001',
        username: 'demo',
        avatar: '',
        is_valid: true,
        last_login_at: new Date().toISOString()
      }
    }
    return res(ctx.status(200), ctx.json(resp))
  }),

  rest.get('/api/user/settings', (_req, res, ctx) => {
    const resp: ApiResponse<{
      user_id: string
      report_template_week: string
      report_template_month: string
      auto_generate_weekly: boolean
      weekly_report_time: string
    }> = {
      code: 0,
      msg: 'ok',
      data: userSettings
    }
    return res(ctx.status(200), ctx.json(resp))
  }),

  rest.put('/api/user/settings', async (req, res, ctx) => {
    userSettings = { ...userSettings, ...(await req.json() as typeof userSettings) }
    const resp: ApiResponse<null> = { code: 0, msg: 'ok', data: null }
    return res(ctx.status(200), ctx.json(resp))
  }),

  rest.post('/api/refresh', async (_req, res, ctx) => {
    const expireAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const resp: ApiResponse<{ access_token: string; expire_at: string }> = {
      code: 0,
      msg: 'ok',
      data: {
        access_token: 'mock_jwt_refreshed_' + Date.now(),
        expire_at: expireAt
      }
    }
    return res(ctx.status(200), ctx.json(resp))
  }),

  // ========== 工作记录模块 ==========
  rest.get('/api/records', (req, res, ctx) => {
    const date = req.url.searchParams.get('date')
    if (date) {
      const found = logs.find(item => item.date === date)
      const resp: ApiResponse<ReturnType<typeof toRecordResp> | null> = {
        code: 0,
        msg: 'ok',
        data: found ? toRecordResp(found) : null
      }
      return res(ctx.status(200), ctx.json(resp))
    }
    const resp: ApiResponse<ReturnType<typeof toRecordResp>[]> = {
      code: 0,
      msg: 'ok',
      data: logs.map(toRecordResp)
    }
    return res(ctx.status(200), ctx.json(resp))
  }),

  rest.get('/api/records/range', (req, res, ctx) => {
    const start = req.url.searchParams.get('start') || ''
    const end = req.url.searchParams.get('end') || ''
    const filtered = logs.filter(item => item.date >= start && item.date <= end)
    const resp: ApiResponse<ReturnType<typeof toRecordResp>[]> = {
      code: 0,
      msg: 'ok',
      data: filtered.map(toRecordResp)
    }
    return res(ctx.status(200), ctx.json(resp))
  }),

  rest.post('/api/records', async (req, res, ctx) => {
    const body = await req.json()
    const { date, content } = body as { date: string; content: string }
    const existing = logs.find(item => item.date === date)
    const now = new Date().toISOString()
    if (existing) {
      existing.content = content
      existing.updatedAt = now
      existing.version = (existing.version ?? 1) + 1
      const resp: ApiResponse<ReturnType<typeof toRecordResp>> = {
        code: 0,
        msg: 'ok',
        data: toRecordResp(existing)
      }
      return res(ctx.status(200), ctx.json(resp))
    }
    const created: RawLog = {
      id: `rec_${Date.now()}`,
      date,
      content,
      updatedAt: now,
      version: 1
    }
    logs = [...logs, created]
    const resp: ApiResponse<ReturnType<typeof toRecordResp>> = {
      code: 0,
      msg: 'ok',
      data: toRecordResp(created)
    }
    return res(ctx.status(200), ctx.json(resp))
  }),

  rest.delete('/api/records/:record_id', (req, res, ctx) => {
    const { record_id } = req.params
    logs = logs.filter(item => item.id !== record_id)
    const resp: ApiResponse<null> = { code: 0, msg: 'ok', data: null }
    return res(ctx.status(200), ctx.json(resp))
  }),

  // ========== 报告模块 ==========
  rest.get('/api/reports', (req, res, ctx) => {
    const periodType = req.url.searchParams.get('period_type')
    const filtered = periodType
      ? reports.filter(item => item.period === periodType)
      : reports
    const resp: ApiResponse<ReturnType<typeof toReportResp>[]> = {
      code: 0,
      msg: 'ok',
      data: filtered.map(toReportResp)
    }
    return res(ctx.status(200), ctx.json(resp))
  }),

  rest.get('/api/reports/:report_id', (req, res, ctx) => {
    const { report_id } = req.params
    const found = reports.find(item => item.id === report_id)
    if (!found) {
      const resp: ApiResponse<null> = { code: 404, msg: '报告不存在', data: null }
      return res(ctx.status(404), ctx.json(resp))
    }
    const resp: ApiResponse<ReturnType<typeof toReportResp>> = {
      code: 0,
      msg: 'ok',
      data: toReportResp(found)
    }
    return res(ctx.status(200), ctx.json(resp))
  }),

  rest.post('/api/reports/generate', async (req, res, ctx) => {
    const body = await req.json()
    const { period_type, start_date, end_date, template } = body as {
      period_type: Report['period']
      start_date: string
      end_date: string
      template: 'formal' | 'simple'
    }
    const now = new Date()
    const existing = reports.find(item =>
      item.period === period_type && item.startDate === start_date && item.endDate === end_date
    )
    const reportId = existing?.id ?? `r${now.getTime()}`
    const startLabel = format(parseISO(start_date), 'yyyy年MM月dd日')
    const endLabel = format(parseISO(end_date), 'MM月dd日')
    const title =
      period_type === 'week'
        ? `${startLabel}-${endLabel} 周报`
        : period_type === 'month'
          ? `${start_date.slice(0, 7).replace('-', '年')}月报`
          : `${start_date.slice(0, 4)}年度总结`
    const content = [
      `# ${template === 'formal' ? '正式版' : '简约版'}${period_type === 'year' ? '年终总结' : '报告'}`,
      '- 核心产出：保持进展与质量',
      '- 风险与阻碍：已给出应对方案',
      '- 下阶段计划：按优先级推进'
    ].join('\n')
    const created: RawReport = {
      id: reportId,
      period: period_type,
      startDate: start_date,
      endDate: end_date,
      title,
      content,
      confirmed: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }
    if (existing) {
      existing.title = title
      existing.content = content
      existing.template = template
      existing.confirmed = false
      existing.status = 'ready'
      existing.updatedAt = now.toISOString()
    } else {
      created.template = template
      created.status = 'ready'
      reports = [created, ...reports]
    }
    // 返回 report_id 字符串
    const resp: ApiResponse<string> = { code: 0, msg: 'ok', data: reportId }
    return res(ctx.status(200), ctx.json(resp))
  }),

  rest.post('/api/reports/edit', async (req, res, ctx) => {
    const body = await req.json()
    const { report_id, content } = body as { report_id: string; content: string }
    const found = reports.find(item => item.id === report_id)
    if (found) {
      found.content = content
      found.confirmed = false
      found.updatedAt = new Date().toISOString()
    }
    const resp: ApiResponse<null> = { code: 0, msg: 'ok', data: null }
    return res(ctx.status(200), ctx.json(resp))
  }),

  rest.post('/api/reports/confirm', async (req, res, ctx) => {
    const body = await req.json()
    const { report_id } = body as { report_id: string }
    const found = reports.find(item => item.id === report_id)
    if (found) {
      found.confirmed = true
    }
    const resp: ApiResponse<null> = { code: 0, msg: 'ok', data: null }
    return res(ctx.status(200), ctx.json(resp))
  }),

  rest.post('/api/reports/refine', async (req, res, ctx) => {
    const body = await req.json()
    const { report_id, feedback } = body as { report_id: string; feedback: string }
    const found = reports.find(item => item.id === report_id)
    if (!found) {
      const resp: ApiResponse<null> = { code: 404, msg: '报告不存在', data: null }
      return res(ctx.status(404), ctx.json(resp))
    }
    // 模拟优化：将反馈作为引用追加到内容开头
    found.content = `> 用户反馈：${feedback}\n\n${found.content}`
    found.confirmed = false
    found.updatedAt = new Date().toISOString()
    const resp: ApiResponse<string> = { code: 0, msg: 'ok', data: report_id }
    return res(ctx.status(200), ctx.json(resp))
  }),

  // ========== 看板模块 ==========
  rest.get('/api/dashboard/month', (req, res, ctx) => {
    const month = req.url.searchParams.get('month') || format(new Date(), 'yyyy-MM')
    const [yearStr, monthStr] = month.split('-')
    const year = parseInt(yearStr, 10)
    const mon = parseInt(monthStr, 10)
    const daysInMonth = new Date(year, mon, 0).getDate()
    const now = new Date()
    const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === mon
    const today = now.getDate()

    const recordedSet = new Set(logs.map(item => item.date))
    const days = []
    let recordedCount = 0
    for (let d = 1; d <= daysInMonth; d++) {
      if (isCurrentMonth && d > today) break
      const dateStr = `${month}-${String(d).padStart(2, '0')}`
      const hasRecord = recordedSet.has(dateStr)
      if (hasRecord) recordedCount++
      days.push({ date: dateStr, has_record: hasRecord })
    }
    const total = days.length
    const missing = total - recordedCount
    const rate = total > 0 ? Math.round((recordedCount / total) * 100) : 0

    const resp: ApiResponse<{
      recorded_days: number
      missing_days: number
      rate: number
      days: Array<{ date: string; has_record: boolean }>
    }> = {
      code: 0,
      msg: 'ok',
      data: {
        recorded_days: recordedCount,
        missing_days: missing,
        rate,
        days
      }
    }
    return res(ctx.status(200), ctx.json(resp))
  }),

  // ========== 补卡模块 ==========
  rest.post('/api/attendance/settings/get', (_req, res, ctx) => {
    const resp: ApiResponse<AttendanceSettingsResponse> = {
      code: 0,
      msg: 'ok',
      data: attendanceSettings
    }
    return res(ctx.status(200), ctx.json(resp))
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
    const resp: ApiResponse<{ saved: boolean }> = { code: 0, msg: 'ok', data: { saved: true } }
    return res(ctx.status(200), ctx.json(resp))
  }),

  rest.post('/api/attendance/records/query', async (req, res, ctx) => {
    const body = await req.json()
    const month = (body as { month?: string }).month || format(new Date(), 'yyyy-MM')
    const records = attendanceRecords.filter(item => item.date.startsWith(month))
    const resp: ApiResponse<AttendanceRecordsQueryResp> = {
      code: 0,
      msg: 'ok',
      data: {
        records,
        summary: getAttendanceSummary(month)
      }
    }
    return res(ctx.status(200), ctx.json(resp))
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
    const resp: ApiResponse<AttendanceRecordSaveResp> = {
      code: 0,
      msg: 'ok',
      data: { id: recordId, updated }
    }
    return res(ctx.status(200), ctx.json(resp))
  }),

  rest.post('/api/attendance/records/delete', async (req, res, ctx) => {
    const body = await req.json()
    const { id } = body as { id: string }
    attendanceRecords = attendanceRecords.filter(item => item.id !== id)
    const resp: ApiResponse<{ deleted: boolean }> = {
      code: 0,
      msg: 'ok',
      data: { deleted: true }
    }
    return res(ctx.status(200), ctx.json(resp))
  }),

  rest.post('/api/attendance/push/history', (_req, res, ctx) => {
    const resp: ApiResponse<AttendancePushHistoryResp> = {
      code: 0,
      msg: 'ok',
      data: { list: buildAttendanceHistory() }
    }
    return res(ctx.status(200), ctx.json(resp))
  }),

  rest.post('/api/attendance/push/manual', async (req, res, ctx) => {
    const body = await req.json()
    const month = ((body as { month?: string }).month || '').trim()
    if (!month) {
      const resp: ApiResponse<null> = { code: 400, msg: '请求参数错误', data: null }
      return res(ctx.status(400), ctx.json(resp))
    }
    const hasRecords = attendanceRecords.some(item => item.date.startsWith(month))
    if (!hasRecords) {
      const resp: ApiResponse<null> = { code: 5011, msg: '补卡记录为空，无法推送', data: null }
      return res(ctx.status(400), ctx.json(resp))
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
    const resp: ApiResponse<AttendancePushManualResp> = {
      code: 0,
      msg: 'ok',
      data: { triggered: true, mail_id: `mail_${Date.now()}` }
    }
    return res(ctx.status(200), ctx.json(resp))
  })
]
