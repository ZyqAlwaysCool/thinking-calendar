import { rest } from 'msw'
import { format, getISOWeek, parseISO } from 'date-fns'
import raw from './data.json'
import { type ApiResponse, type Log, type Report } from '@/types'

type RawLog = Log & { count?: number; version?: number }
type RawReport = Report & { updatedAt?: string }

const rawLogs = (raw.logs as RawLog[]) || []
const rawReports = (raw.reports as RawReport[]) || []

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
  })
]
