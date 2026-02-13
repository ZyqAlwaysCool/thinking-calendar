import { create } from 'zustand'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'
import { api, extractErrorMessage } from '@/lib/api'
import { ATTENDANCE_TEXT } from '@/lib/constants'
import {
  type ApiResponse,
  type AttendanceRecord,
  type AttendanceRecordSavePayload,
  type AttendanceRecordSaveResp,
  type AttendanceRecordsQueryResp,
  type AttendanceSettings,
  type AttendanceSettingsResponse,
  type AttendanceSettingsSavePayload,
  type AttendanceSummary
} from '@/types'

type AttendanceState = {
  settings: AttendanceSettings
  records: AttendanceRecord[]
  summary: AttendanceSummary
  month: string
  loadingSettings: boolean
  loadingRecords: boolean
  savingSettings: boolean
  savingRecord: boolean
  deletingRecord: boolean
  isEditing: boolean
  settingsSaved: boolean
  fetchSettings: () => Promise<void>
  fetchRecords: (month: string, silent?: boolean) => Promise<void>
  saveSettings: (payload: AttendanceSettingsSavePayload) => Promise<boolean>
  saveRecord: (payload: AttendanceRecordSavePayload) => Promise<boolean>
  deleteRecord: (recordId: string) => Promise<boolean>
  setEditing: (editing: boolean) => void
  resetSettingsSaved: () => void
}

const defaultSettings: AttendanceSettings = {
  monthlyLimit: 8,
  pushDay: 'last',
  pushTime: '09:00',
  email: '',
  lastPushedMonth: ''
}

const defaultSummary: AttendanceSummary = {
  used: 0,
  limit: 8,
  locked: false
}

const mapSettings = (payload?: AttendanceSettingsResponse | null): AttendanceSettings => ({
  monthlyLimit: payload?.monthly_limit ?? defaultSettings.monthlyLimit,
  pushDay: payload?.push_day ?? defaultSettings.pushDay,
  pushTime: payload?.push_time ?? defaultSettings.pushTime,
  email: payload?.email ?? defaultSettings.email,
  lastPushedMonth: payload?.last_pushed_month ?? ''
})

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  settings: defaultSettings,
  records: [],
  summary: defaultSummary,
  month: format(new Date(), 'yyyy-MM'),
  loadingSettings: true,
  loadingRecords: true,
  savingSettings: false,
  savingRecord: false,
  deletingRecord: false,
  isEditing: true,
  settingsSaved: false,
  fetchSettings: async () => {
    set({ loadingSettings: true })
    try {
      const res = await api.post<ApiResponse<AttendanceSettingsResponse>>('/attendance/settings/get', {})
      const nextSettings = mapSettings(res.data.data)
      set(state => ({
        settings: nextSettings,
        summary: {
          ...state.summary,
          limit: nextSettings.monthlyLimit
        },
        loadingSettings: false
      }))
    } catch (error) {
      set({ loadingSettings: false })
      toast.error(extractErrorMessage(error, ATTENDANCE_TEXT.loadFail))
    }
  },
  fetchRecords: async (month: string, silent = false) => {
    if (!silent) {
      set({ loadingRecords: true })
    }
    try {
      const res = await api.post<ApiResponse<AttendanceRecordsQueryResp>>('/attendance/records/query', { month })
      const response = res.data.data
      set({
        records: response.records || [],
        summary: response.summary || defaultSummary,
        month,
        loadingRecords: false
      })
    } catch (error) {
      if (!silent) {
        set({ loadingRecords: false })
      }
      toast.error(extractErrorMessage(error, ATTENDANCE_TEXT.loadFail))
    }
  },
  saveSettings: async (payload: AttendanceSettingsSavePayload) => {
    set({ savingSettings: true })
    try {
      await api.post<ApiResponse<unknown>>('/attendance/settings/save', {
        monthly_limit: payload.monthlyLimit,
        push_day: payload.pushDay,
        push_time: payload.pushTime,
        email: payload.email
      })
      set(state => ({
        settings: {
          ...state.settings,
          monthlyLimit: payload.monthlyLimit,
          pushDay: payload.pushDay,
          pushTime: payload.pushTime,
          email: payload.email
        },
        summary: {
          ...state.summary,
          limit: payload.monthlyLimit
        },
        savingSettings: false,
        settingsSaved: true,
        isEditing: false
      }))
      toast.success(ATTENDANCE_TEXT.settingsSaveSuccess)
      return true
    } catch (error) {
      set({ savingSettings: false })
      toast.error(extractErrorMessage(error, ATTENDANCE_TEXT.settingsSaveFail))
      return false
    }
  },
  saveRecord: async (payload: AttendanceRecordSavePayload) => {
    set({ savingRecord: true })
    try {
      await api.post<ApiResponse<AttendanceRecordSaveResp>>('/attendance/records/save', {
        date: payload.date,
        type: payload.type,
        note: payload.note
      })
      const targetMonth = get().month || format(new Date(), 'yyyy-MM')
      await get().fetchRecords(targetMonth, true)
      set({ savingRecord: false })
      toast.success(ATTENDANCE_TEXT.recordSaveSuccess)
      return true
    } catch (error) {
      set({ savingRecord: false })
      toast.error(extractErrorMessage(error, ATTENDANCE_TEXT.recordSaveFail))
      return false
    }
  },
  deleteRecord: async (recordId: string) => {
    set({ deletingRecord: true })
    try {
      await api.post<ApiResponse<unknown>>('/attendance/records/delete', { id: recordId })
      const targetMonth = get().month || format(new Date(), 'yyyy-MM')
      await get().fetchRecords(targetMonth, true)
      set({ deletingRecord: false })
      toast.success(ATTENDANCE_TEXT.recordDeleteSuccess)
      return true
    } catch (error) {
      set({ deletingRecord: false })
      toast.error(extractErrorMessage(error, ATTENDANCE_TEXT.recordDeleteFail))
      return false
    }
  },
  setEditing: (editing: boolean) => {
    set({ isEditing: editing, settingsSaved: editing ? false : get().settingsSaved })
  },
  resetSettingsSaved: () => {
    set({ settingsSaved: false })
  }
}))
