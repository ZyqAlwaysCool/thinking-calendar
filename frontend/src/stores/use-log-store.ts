import { create } from 'zustand'
import { toast } from 'react-hot-toast'
import { api, extractErrorMessage } from '@/lib/api'
import { PAGE_TEXT } from '@/lib/constants'
import { type ApiResponse, type Log, type LogState, type RecordResp, type SaveLogPayload } from '@/types'
import { normalizeMarkdown } from '@/lib/markdown'

const mapRecord = (item: RecordResp): Log => ({
  id: item.record_id,
  date: item.date,
  content: normalizeMarkdown(item.content),
  updatedAt: item.updatedAt || new Date().toISOString(),
  version: item.version ?? 0
})

export const useLogStore = create<LogState>((set, get) => ({
  logs: [],
  currentLog: null,
  loading: true,
  saving: false,
  fetchLogs: async (silent = false) => {
    if (!silent) set({ loading: true })
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
      const res = await api.get<ApiResponse<RecordResp | null>>('/records', {
        params: { date },
        timeout: 15000
      })
      const record = res.data.data
      if (record !== null && record?.date !== date) {
        throw new Error(PAGE_TEXT.recordDateMismatch)
      }
      const loaded: Log = record === null ? {
        id: '',
        date,
        content: '',
        updatedAt: new Date().toISOString(),
        version: 0
      } : mapRecord(record)
      set({ currentLog: loaded, loading: false })
      return loaded
    } catch (error) {
      set({ loading: false })
      toast.error(extractErrorMessage(error, PAGE_TEXT.loadFail))
      throw error
    }
  },
  saveLog: async (payload: SaveLogPayload, silent = false) => {
    set({ saving: true })
    try {
      const trimmed = payload.content.trim()
      const current = get().currentLog

      if (!trimmed) {
        if (current?.id) {
          await api.delete<ApiResponse<unknown>>(`/records/${current.id}`)
          set({
            logs: get().logs.filter(item => item.id !== current.id),
            currentLog: {
              id: '',
              date: payload.date,
              content: '',
              updatedAt: new Date().toISOString(),
              version: 0
            },
            saving: false
          })
          if (!silent) toast.success(PAGE_TEXT.saveSuccess)
          return
        }
        set({
          currentLog: {
            id: '',
            date: payload.date,
            content: '',
            updatedAt: new Date().toISOString(),
            version: 0
          },
          saving: false
        })
        return
      }

      const res = await api.post<ApiResponse<RecordResp>>('/records', {
        ...payload,
        content: trimmed
      })
      const saved = mapRecord(res.data.data)
      const existed = get().logs.some(item => item.date === saved.date)
      set({
        logs: existed ? get().logs.map(item => (item.date === saved.date ? saved : item)) : [...get().logs, saved],
        currentLog: saved,
        saving: false
      })
      if (!silent) toast.success(PAGE_TEXT.saveSuccess)
    } catch (error) {
      set({ saving: false })
      toast.error(extractErrorMessage(error, PAGE_TEXT.saveFail))
      throw error
    }
  }
}))
