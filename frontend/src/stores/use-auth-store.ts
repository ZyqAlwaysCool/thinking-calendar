import { create } from 'zustand'
import { toast } from 'react-hot-toast'
import { api, extractErrorMessage, type ApiError } from '@/lib/api'
import { PAGE_TEXT } from '@/lib/constants'
import { clearAuthStorage, loadAuthStorage, saveAuthStorage } from '@/lib/storage'
import { type ApiResponse, type LoginRespData, type User } from '@/types'

type UserResp = {
  user_id: string
  username: string
  avatar?: string
  is_valid: boolean
  last_login_at: string
}

type RefreshResp = {
  access_token: string
  expire_at: string
}

type AuthState = {
  user: User | null
  token: string
  expireAt: string
  refreshToken: string
  refreshExpireAt: string
  loading: boolean
  initializing: boolean
  login: (payload: { username: string; password: string }) => Promise<void>
  refreshAccessToken: () => Promise<void>
  restoreSession: () => Promise<void>
  fetchProfile: () => Promise<void>
  logout: () => void
}

const REFRESH_BUFFER_MS = 5 * 60 * 1000
let refreshTimer: ReturnType<typeof setTimeout> | null = null

const setTimer = (expireAt: string, refresh: () => Promise<void>) => {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
  const expireTime = new Date(expireAt).getTime()
  const delay = expireTime - Date.now() - REFRESH_BUFFER_MS
  const nextDelay = delay > 0 ? delay : 2000
  refreshTimer = setTimeout(() => {
    void refresh()
  }, nextDelay)
}

const mapUser = (data: UserResp): User => ({
  userId: data.user_id,
  username: data.username,
  avatar: data.avatar,
  isValid: data.is_valid,
  lastLoginAt: data.last_login_at
})

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: '',
  expireAt: '',
  refreshToken: '',
  refreshExpireAt: '',
  loading: false,
  initializing: true,
  login: async ({ username, password }) => {
    set({ loading: true })
    try {
      const loginResp = await api.post<ApiResponse<LoginRespData>>('/login', { username, password })
      const accessToken = loginResp.data.data.access_token || loginResp.data.data.accessToken
      const expireAt = loginResp.data.data.expire_at || loginResp.data.data.expireAt
      const refreshToken = loginResp.data.data.refresh_token
      const refreshExpireAt = loginResp.data.data.refresh_expire_at
      if (!accessToken || !expireAt || !refreshToken || !refreshExpireAt) {
        throw { code: 500, msg: PAGE_TEXT.loginFail } satisfies ApiError
      }
      saveAuthStorage({ token: accessToken, expireAt, refreshToken, refreshExpireAt })
      set({
        token: accessToken,
        expireAt,
        refreshToken,
        refreshExpireAt
      })
      setTimer(expireAt, get().refreshAccessToken)
      await get().fetchProfile()
      set({ initializing: false })
      toast.success(PAGE_TEXT.loginSuccess)
    } catch (error) {
      const apiErr = error as ApiError
      if (apiErr.code === 1005) {
        // 用户不存在，先注册再登录
        try {
          await api.post<ApiResponse<unknown>>('/register', { username, password })
          await get().login({ username, password })
          return
        } catch (regErr) {
          const msg = extractErrorMessage(regErr, PAGE_TEXT.loginFail)
          toast.error(msg)
          set({ loading: false })
          throw regErr
        }
      }
      const msg = extractErrorMessage(error, PAGE_TEXT.loginFail)
      toast.error(msg)
      set({ loading: false })
      throw error
    }
    set({ loading: false })
  },
  refreshAccessToken: async () => {
    const state = get()
    if (!state.refreshToken) {
      get().logout()
      return
    }
    try {
      const resp = await api.post<ApiResponse<RefreshResp>>('/refresh', {
        refresh_token: state.refreshToken
      })
      const accessToken = resp.data.data.access_token
      const expireAt = resp.data.data.expire_at
      if (!accessToken || !expireAt) return
      saveAuthStorage({
        token: accessToken,
        expireAt,
        refreshToken: state.refreshToken,
        refreshExpireAt: state.refreshExpireAt
      })
      set({ token: accessToken, expireAt })
      setTimer(expireAt, get().refreshAccessToken)
      await get().fetchProfile()
      set({ initializing: false })
    } catch {
      toast.error(PAGE_TEXT.loginFail)
      get().logout()
    }
  },
  restoreSession: async () => {
    const stored = loadAuthStorage()
    if (stored.token) {
      set({
        token: stored.token,
        expireAt: stored.expireAt,
        refreshToken: stored.refreshToken,
        refreshExpireAt: stored.refreshExpireAt
      })
      const now = Date.now()
      const expireTime = new Date(stored.expireAt).getTime()
      if (expireTime > now) {
        setTimer(stored.expireAt, get().refreshAccessToken)
        try {
          await get().fetchProfile()
          set({ initializing: false })
          return
        } catch {
          // token 失效则尝试刷新
        }
      }
    }
    // 尝试用 refresh_token 续期
    if (stored.refreshToken) {
      const refreshExpire = new Date(stored.refreshExpireAt).getTime()
      if (refreshExpire > Date.now()) {
        set({
          refreshToken: stored.refreshToken,
          refreshExpireAt: stored.refreshExpireAt
        })
        await get().refreshAccessToken()
        return
      }
    }
    set({ initializing: false })
  },
  fetchProfile: async () => {
    const resp = await api.get<ApiResponse<UserResp>>('/user')
    const user = mapUser(resp.data.data)
    set({ user })
  },
  logout: () => {
    if (refreshTimer) {
      clearTimeout(refreshTimer)
      refreshTimer = null
    }
    clearAuthStorage()
    set({
      user: null,
      token: '',
      expireAt: '',
      refreshToken: '',
      refreshExpireAt: '',
      initializing: false
    })
  }
}))
