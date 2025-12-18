import axios, { type AxiosError } from 'axios'
import { clearTokenStorage, TOKEN_KEY } from './storage'

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api'

export type ApiError = {
  code: number
  msg: string
}

export const api = axios.create({
  baseURL
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem(TOKEN_KEY)
    if (stored) {
      const hasBearer = stored.startsWith('Bearer ')
      config.headers.Authorization = hasBearer ? stored : `Bearer ${stored}`
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    const payload = response.data
    if (payload && typeof payload.code === 'number') {
      if (payload.code === 401) {
        clearTokenStorage()
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:unauthorized'))
        }
      }
      if (payload.code === 0) return response
      const err: ApiError = { code: payload.code, msg: payload.msg || '请求失败' }
      return Promise.reject(err)
    }
    return response
  },
  (error: AxiosError<{ code?: number; msg?: string }>) => {
    const code = error.response?.data?.code ?? 500
    const msg = error.response?.data?.msg || '网络异常，请稍后重试'
    if (error.response?.status === 401) {
      clearTokenStorage()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'))
      }
    }
    const err: ApiError = { code, msg }
    return Promise.reject(err)
  }
)

export const extractErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'string') return error
  if (error instanceof Error && error.message) return error.message
  if (error && typeof error === 'object' && 'msg' in error) {
    const msg = (error as { msg?: string }).msg
    if (msg) return msg
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: string }).message
    if (message) return message
  }
  return fallback
}
