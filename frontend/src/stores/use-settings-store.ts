import { create } from 'zustand'
import { toast } from 'react-hot-toast'
import { api, extractErrorMessage } from '@/lib/api'
import { PAGE_TEXT } from '@/lib/constants'
import { type ApiResponse, type UserSettings } from '@/types'

type UserSettingsResp = {
  user_id: string
  report_template_week: string
  report_template_month: string
  auto_generate_weekly: boolean
  weekly_report_time: string
}

type SettingsState = {
  settings: UserSettings | null
  loading: boolean
  saving: boolean
  fetchSettings: () => Promise<void>
  updateSettings: (payload: { reportTemplateWeek: string; reportTemplateMonth: string }) => Promise<void>
}

const mapSettings = (data: UserSettingsResp): UserSettings => ({
  userId: data.user_id,
  reportTemplateWeek: data.report_template_week || '',
  reportTemplateMonth: data.report_template_month || '',
  autoGenerateWeekly: data.auto_generate_weekly,
  weeklyReportTime: data.weekly_report_time
})

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: true,
  saving: false,
  fetchSettings: async () => {
    set({ loading: true })
    try {
      const res = await api.get<ApiResponse<UserSettingsResp>>('/user/settings')
      const mapped = mapSettings(res.data.data)
      set({ settings: mapped, loading: false })
    } catch (error) {
      set({ loading: false })
      toast.error(extractErrorMessage(error, PAGE_TEXT.settingsLoadFail))
      throw error
    }
  },
  updateSettings: async (payload) => {
    const current = get().settings
    if (!current) {
      toast.error(PAGE_TEXT.settingsLoadFail)
      return
    }
    set({ saving: true })
    try {
      const req = {
        user_id: current.userId,
        report_template_week: payload.reportTemplateWeek,
        report_template_month: payload.reportTemplateMonth,
        auto_generate_weekly: current.autoGenerateWeekly,
        weekly_report_time: current.weeklyReportTime
      }
      await api.put<ApiResponse<unknown>>('/user/settings', req)
      set({
        settings: {
          ...current,
          reportTemplateWeek: payload.reportTemplateWeek,
          reportTemplateMonth: payload.reportTemplateMonth
        },
        saving: false
      })
      toast.success(PAGE_TEXT.saveSuccess)
    } catch (error) {
      set({ saving: false })
      toast.error(extractErrorMessage(error, PAGE_TEXT.settingsSaveFail))
      throw error
    }
  }
}))
