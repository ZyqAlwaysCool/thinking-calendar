import { create } from 'zustand'
import { toast } from 'react-hot-toast'
import { api, extractErrorMessage } from '@/lib/api'
import { PAGE_TEXT } from '@/lib/constants'
import { type ApiResponse, type MonthDashboard } from '@/types'

type MonthResp = {
  recorded_days: number
  missing_days: number
  rate: number
  days: Array<{
    date: string
    has_record: boolean
  }>
}

type DashboardState = {
  data: MonthDashboard | null
  loading: boolean
  fetchMonth: (month: string) => Promise<void>
}

const mapResp = (resp: MonthResp): MonthDashboard => ({
  recordedDays: resp.recorded_days,
  missingDays: resp.missing_days,
  rate: resp.rate,
  days: resp.days.map(day => ({
    date: day.date,
    hasRecord: day.has_record
  }))
})

export const useDashboardStore = create<DashboardState>((set) => ({
  data: null,
  loading: false,
  fetchMonth: async (month: string) => {
    set({ loading: true })
    try {
      const res = await api.get<ApiResponse<MonthResp>>('/dashboard/month', { params: { month } })
      set({ data: mapResp(res.data.data), loading: false })
    } catch (error) {
      set({ loading: false })
      toast.error(extractErrorMessage(error, PAGE_TEXT.loadFail))
      throw error
    }
  }
}))
