import { create } from 'zustand'
import { toast } from 'react-hot-toast'
import { api, extractErrorMessage } from '@/lib/api'
import { PAGE_TEXT } from '@/lib/constants'
import { type ApiResponse, type Log, type SaveLogPayload } from '@/types'
import { normalizeMarkdown } from '@/lib/markdown'

type RecordResp = {
  record_id: string
  date: string
  content: string
  updatedAt: string
  version: number
}

const mapRecord = (item: RecordResp): Log => ({
  id: item.record_id,
  date: item.date,
  content: normalizeMarkdown(item.content),
  updatedAt: item.updatedAt || new Date().toISOString(),
  version: item.version ?? 0
})

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
      const res = await api.get<ApiResponse<RecordResp[]>>('/records')
      const mapped = (res.data.data || []).map(mapRecord)
      set({ logs: mapped, loading: false })
    } catch (error) {
      set({ loading: false })
      toast.error(extractErrorMessage(error, PAGE_TEXT.loadFail))
      throw error
    }
  },
  fetchLogByDate: async (date: string) => {
    set({ loading: true })
    try {
      const res = await api.get<ApiResponse<RecordResp | null>>('/records', { params: { date } })
      const found = res.data.data ? mapRecord(res.data.data) : null
      const fallback: Log = {
        id: '',
        date,
        content: '',
        updatedAt: new Date().toISOString(),
        version: 0
      }
      set({ currentLog: found ?? fallback, loading: false })
    } catch (error) {
      set({ loading: false })
      toast.error(extractErrorMessage(error, PAGE_TEXT.loadFail))
      throw error
    }
  },
  saveLog: async (payload: SaveLogPayload) => {
    set({ saving: true })
    try {
      const res = await api.post<ApiResponse<RecordResp>>('/records', payload)
      const saved = mapRecord(res.data.data)
      const existed = get().logs.some(item => item.date === saved.date)
      set({
        logs: existed ? get().logs.map(item => (item.date === saved.date ? saved : item)) : [...get().logs, saved],
        currentLog: saved,
        saving: false
      })
      toast.success(PAGE_TEXT.saveSuccess)
    } catch (error) {
      set({ saving: false })
      toast.error(extractErrorMessage(error, PAGE_TEXT.saveFail))
      throw error
    }
  }
}))
