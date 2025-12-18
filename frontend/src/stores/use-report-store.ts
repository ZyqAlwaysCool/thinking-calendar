import { create } from 'zustand'
import { toast } from 'react-hot-toast'
import { api, extractErrorMessage } from '@/lib/api'
import { PAGE_TEXT } from '@/lib/constants'
import { normalizeMarkdown } from '@/lib/markdown'
import { type ApiResponse, type GenerateReportPayload, type Report } from '@/types'

type ReportResp = {
  report_id: string
  period_type: 'week' | 'month' | 'year'
  start_date: string
  end_date: string
  title: string
  content: string
  abstract?: string
  confirmed: boolean
  template: 'formal' | 'simple'
  status: 'queued' | 'processing' | 'ready' | 'failed'
  failed_reason?: string
  created_at: string
  updated_at: string
}

type ReportState = {
  reports: Report[]
  loading: boolean
  generating: boolean
  fetchReports: () => Promise<void>
  generateReport: (payload: GenerateReportPayload) => Promise<Report>
  confirmReport: (payload: { id: string; content?: string }) => Promise<Report>
  markUnconfirmed: (id: string) => void
}

const mapReport = (item: ReportResp): Report => ({
  id: item.report_id,
  period: item.period_type,
  startDate: item.start_date,
  endDate: item.end_date,
  title: item.title,
  content: normalizeMarkdown(item.content),
  confirmed: item.confirmed,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
  status: item.status,
  template: item.template,
  failedReason: item.failed_reason
})

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const rawInterval = Number(process.env.NEXT_PUBLIC_REPORT_POLL_INTERVAL_MS)
const rawTimeout = Number(process.env.NEXT_PUBLIC_REPORT_POLL_TIMEOUT_MS)
const POLL_INTERVAL_MS = Number.isFinite(rawInterval) && rawInterval > 0 ? rawInterval : 5000
const POLL_TIMEOUT_MS = Number.isFinite(rawTimeout) && rawTimeout > 0 ? rawTimeout : 60 * 1000

export const useReportStore = create<ReportState>((set, get) => ({
  reports: [],
  loading: true,
  generating: false,
  fetchReports: async () => {
    set({ loading: true })
    try {
      const periods: Array<ReportResp['period_type']> = ['week', 'month', 'year']
      const list = await Promise.all(
        periods.map(period =>
          api.get<ApiResponse<ReportResp[]>>('/reports', { params: { period_type: period } }).then(res => res.data.data || [])
        )
      )
      const merged = list.flat().map(mapReport).sort((a, b) => (a.endDate < b.endDate ? 1 : -1))
      set({ reports: merged, loading: false })
    } catch (error) {
      set({ loading: false })
      toast.error(extractErrorMessage(error, PAGE_TEXT.loadFail))
      throw error
    }
  },
  generateReport: async (payload: GenerateReportPayload) => {
    set({ generating: true })
    try {
      const request = {
        period_type: payload.period,
        start_date: payload.startDate,
        end_date: payload.endDate,
        template: payload.template
      }
      const res = await api.post<ApiResponse<string>>('/reports/generate', request)
      const reportId = res.data.data

      // 生成占位拉取一次
      try {
        const placeholder = await api.get<ApiResponse<ReportResp>>(`/reports/${reportId}`)
        const mapped = mapReport(placeholder.data.data)
        set({
          reports: [mapped, ...get().reports.filter(item => item.id !== mapped.id)]
        })
      } catch {
        // 占位获取失败不影响后续轮询
      }

      const deadline = Date.now() + POLL_TIMEOUT_MS
      let final: Report | null = null
      while (Date.now() < deadline) {
        const detail = await api.get<ApiResponse<ReportResp>>(`/reports/${reportId}`)
        const mapped = mapReport(detail.data.data)
        set({
          reports: [mapped, ...get().reports.filter(item => item.id !== mapped.id)]
        })
        if (mapped.status === 'ready') {
          final = mapped
          break
        }
        if (mapped.status === 'failed') {
          throw new Error(mapped.failedReason || PAGE_TEXT.generateFail)
        }
        await sleep(POLL_INTERVAL_MS)
      }
      if (!final) {
        throw new Error(PAGE_TEXT.generateFail)
      }
      toast.success(PAGE_TEXT.generateSuccess)
      return final
    } catch (error) {
      toast.error(extractErrorMessage(error, PAGE_TEXT.generateFail))
      throw error
    } finally {
      set({ generating: false })
    }
  },
  confirmReport: async ({ id, content }) => {
    try {
      if (content !== undefined) {
        await api.post<ApiResponse<unknown>>('/reports/edit', { report_id: id, content })
      }
      await api.post<ApiResponse<unknown>>('/reports/confirm', { report_id: id })
      const detail = await api.get<ApiResponse<ReportResp>>(`/reports/${id}`)
      const mapped = mapReport(detail.data.data)
      set({
        reports: get().reports.map(item => (item.id === id ? mapped : item))
      })
      toast.success(PAGE_TEXT.confirmSuccess)
      return mapped
    } catch (error) {
      toast.error(extractErrorMessage(error, PAGE_TEXT.confirmFail))
      throw error
    }
  },
  markUnconfirmed: (id: string) => {
    set({
      reports: get().reports.map(item => (item.id === id ? { ...item, confirmed: false } : item))
    })
  }
}))
