import { create } from 'zustand'
import { toast } from 'react-hot-toast'
import { api } from '@/lib/api'
import { PAGE_TEXT } from '@/lib/constants'
import { type ApiResponse, type GenerateReportPayload, type Report } from '@/types'

type ReportState = {
  reports: Report[]
  recent: Report[]
  loading: boolean
  generating: boolean
  fetchReports: () => Promise<void>
  fetchRecent: () => Promise<void>
  generateReport: (payload: GenerateReportPayload) => Promise<Report>
  confirmReport: (id: string) => Promise<void>
}

export const useReportStore = create<ReportState>((set, get) => ({
  reports: [],
  recent: [],
  loading: true,
  generating: false,
  fetchReports: async () => {
    set({ loading: true })
    try {
      const res = await api.get<ApiResponse<Report[]>>('/reports')
      set({ reports: res.data.data, loading: false })
    } catch (error) {
      set({ loading: false })
      toast.error(PAGE_TEXT.loadFail)
      throw error
    }
  },
  fetchRecent: async () => {
    try {
      const res = await api.get<ApiResponse<Report[]>>('/reports/recent')
      set({ recent: res.data.data })
    } catch (error) {
      toast.error(PAGE_TEXT.loadFail)
      throw error
    }
  },
  generateReport: async (payload: GenerateReportPayload) => {
    set({ generating: true })
    try {
      const res = await api.post<ApiResponse<Report>>('/reports/generate', payload)
      const created = res.data.data
      set({ reports: [created, ...get().reports], generating: false })
      toast.success(PAGE_TEXT.generateSuccess)
      return created
    } catch (error) {
      set({ generating: false })
      toast.error(PAGE_TEXT.generateFail)
      throw error
    }
  },
  confirmReport: async (id: string) => {
    try {
      const res = await api.post<ApiResponse<Report>>('/reports/confirm', { id })
      const confirmed = res.data.data
      set({
        reports: get().reports.map(item => (item.id === id ? confirmed : item)),
        recent: get().recent.map(item => (item.id === id ? confirmed : item))
      })
      toast.success(PAGE_TEXT.confirmSuccess)
    } catch (error) {
      toast.error(PAGE_TEXT.confirmFail)
      throw error
    }
  }
}))
