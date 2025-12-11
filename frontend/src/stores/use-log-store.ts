import { create } from 'zustand'
import { toast } from 'react-hot-toast'
import { api } from '@/lib/api'
import { PAGE_TEXT } from '@/lib/constants'
import { type ApiResponse, type Log, type SaveLogPayload } from '@/types'
import { waitForMock } from '@/mock/wait-mock'

type LogState = {
  logs: Log[]
  currentLog: Log | null
  loading: boolean
  saving: boolean
  fetchLogs: () => Promise<void>
  fetchLogByDate: (date: string) => Promise<void>
  saveLog: (payload: SaveLogPayload) => Promise<void>
}

export const useLogStore = create<LogState>((set, get) => ({
  logs: [],
  currentLog: null,
  loading: true,
  saving: false,
  fetchLogs: async () => {
    set({ loading: true })
    try {
      await waitForMock()
      const res = await api.get<ApiResponse<Log[]>>('/logs')
      set({ logs: res.data.data, loading: false })
    } catch (error) {
      set({ loading: false })
      toast.error(PAGE_TEXT.loadFail)
      throw error
    }
  },
  fetchLogByDate: async (date: string) => {
    set({ loading: true })
    try {
      await waitForMock()
      const res = await api.get<ApiResponse<Log | null>>('/logs', { params: { date } })
      const found = res.data.data
      const fallback: Log = {
        id: '',
        date,
        content: '',
        updatedAt: new Date().toISOString(),
        count: 0
      }
      set({ currentLog: found ?? fallback, loading: false })
    } catch (error) {
      set({ loading: false })
      toast.error(PAGE_TEXT.loadFail)
      throw error
    }
  },
  saveLog: async (payload: SaveLogPayload) => {
    set({ saving: true })
    try {
      await waitForMock()
      const res = await api.post<ApiResponse<Log>>('/logs', payload)
      const saved = res.data.data
      const existed = get().logs.some(item => item.date === saved.date)
      set({
        logs: existed ? get().logs.map(item => (item.date === saved.date ? saved : item)) : [...get().logs, saved],
        currentLog: saved,
        saving: false
      })
      toast.success(PAGE_TEXT.saveSuccess)
    } catch (error) {
      set({ saving: false })
      toast.error(PAGE_TEXT.saveFail)
      throw error
    }
  }
}))
