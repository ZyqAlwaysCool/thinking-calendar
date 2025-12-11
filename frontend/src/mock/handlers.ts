import { rest } from 'msw'
import raw from './data.json'
import { type ApiResponse, type Log, type Report } from '@/types'

let logs: Log[] = [...raw.logs]
let reports: Report[] = [...raw.reports]

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
      existing.count = Math.max(1, content.split('\\n').length)
      const response: ApiResponse<Log> = { code: 0, msg: 'success', data: existing }
      return res(ctx.status(200), ctx.json(response))
    }
    const created: Log = {
      id: String(logs.length + 1),
      date,
      content,
      updatedAt: now.toISOString(),
      count: Math.max(1, content.split('\\n').length)
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
    const { period, startDate, endDate, template } = body as {
      period: Report['period']
      startDate: string
      endDate: string
      template: 'formal' | 'simple'
    }
    const now = new Date()
    const id = `r${now.getTime()}`
    const title =
      period === 'week'
        ? `第${reports.length + 48}周周报`
        : period === 'month'
          ? `${startDate.slice(0, 7).replace('-', '年')}月报`
          : `${startDate.slice(0, 4)}年度总结`
    const content = [
      `# ${template === 'formal' ? '正式版' : '简约版'}${period === 'year' ? '年终总结' : '报告'}`,
      '- 核心产出：保持进展与质量',
      '- 风险与阻碍：已给出应对方案',
      '- 下阶段计划：按优先级推进'
    ].join('\\n')
    const created: Report = {
      id,
      period,
      startDate,
      endDate,
      title,
      content,
      confirmed: false,
      createdAt: now.toISOString()
    }
    reports = [created, ...reports]
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
