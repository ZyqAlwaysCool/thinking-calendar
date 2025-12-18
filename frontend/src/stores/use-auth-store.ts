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

type AuthState = {
  user: User | null
  token: string
  expireAt: string
  username: string
  password: string
  loading: boolean
  initializing: boolean
  login: (payload: { username: string; password: string }) => Promise<void>
  refreshToken: () => Promise<void>
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
  username: '',
  password: '',
  loading: false,
  initializing: true,
  login: async ({ username, password }) => {
    set({ loading: true })
    try {
      const loginResp = await api.post<ApiResponse<LoginRespData>>('/login', { username, password })
      const accessToken = loginResp.data.data.access_token || loginResp.data.data.accessToken
      const expireAt = loginResp.data.data.expire_at || loginResp.data.data.expireAt
      if (!accessToken || !expireAt) {
        throw { code: 500, msg: PAGE_TEXT.loginFail } satisfies ApiError
      }
      saveAuthStorage({ token: accessToken, expireAt, username, password })
      set({
        token: accessToken,
        expireAt,
        username,
        password
      })
      setTimer(expireAt, get().refreshToken)
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
  refreshToken: async () => {
    const state = get()
    if (!state.username || !state.password) {
      return
    }
    try {
      const resp = await api.post<ApiResponse<LoginRespData>>('/login', {
        username: state.username,
        password: state.password
      })
      const accessToken = resp.data.data.access_token || resp.data.data.accessToken
      const expireAt = resp.data.data.expire_at || resp.data.data.expireAt
      if (!accessToken || !expireAt) return
      saveAuthStorage({
        token: accessToken,
        expireAt,
        username: state.username,
        password: state.password
      })
      set({
        token: accessToken,
        expireAt
      })
      setTimer(expireAt, get().refreshToken)
      await get().fetchProfile()
      set({ initializing: false })
    } catch (error) {
      const msg = extractErrorMessage(error, PAGE_TEXT.loginFail)
      toast.error(msg)
      get().logout()
    }
  },
  restoreSession: async () => {
    const stored = loadAuthStorage()
    if (!stored.token && stored.username && stored.password) {
      set({ username: stored.username, password: stored.password })
    }
    if (stored.token) {
      set({
        token: stored.token,
        expireAt: stored.expireAt,
        username: stored.username,
        password: stored.password
      })
      const now = Date.now()
      const expireTime = new Date(stored.expireAt).getTime()
      if (expireTime > now) {
        setTimer(stored.expireAt, get().refreshToken)
        try {
          await get().fetchProfile()
          set({ initializing: false })
          return
        } catch {
          // 如果 token 失效则继续尝试登录
        }
      }
    }
    if (stored.username && stored.password) {
      await get().refreshToken()
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
      username: '',
      password: '',
      initializing: false
    })
  }
}))
