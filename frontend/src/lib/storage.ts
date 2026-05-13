export const TOKEN_KEY = 'tc_access_token'
export const EXPIRE_KEY = 'tc_access_expire'
export const REFRESH_KEY = 'tc_refresh_token'
export const REFRESH_EXPIRE_KEY = 'tc_refresh_expire'

const load = (key: string) => {
  if (typeof window === 'undefined') return ''
  return sessionStorage.getItem(key) || ''
}

const save = (key: string, value: string) => {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(key, value)
}

export const loadAuthStorage = () => {
  if (typeof window === 'undefined') {
    return {
      token: '',
      expireAt: '',
      refreshToken: '',
      refreshExpireAt: ''
    }
  }
  return {
    token: load(TOKEN_KEY),
    expireAt: load(EXPIRE_KEY),
    refreshToken: load(REFRESH_KEY),
    refreshExpireAt: load(REFRESH_EXPIRE_KEY)
  }
}

export const saveAuthStorage = (payload: { token: string; expireAt: string; refreshToken: string; refreshExpireAt: string }) => {
  if (typeof window === 'undefined') return
  save(TOKEN_KEY, payload.token)
  save(EXPIRE_KEY, payload.expireAt)
  save(REFRESH_KEY, payload.refreshToken)
  save(REFRESH_EXPIRE_KEY, payload.refreshExpireAt)
}

export const clearAuthStorage = () => {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(EXPIRE_KEY)
  sessionStorage.removeItem(REFRESH_KEY)
  sessionStorage.removeItem(REFRESH_EXPIRE_KEY)
}

export const clearTokenStorage = () => {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(EXPIRE_KEY)
  sessionStorage.removeItem(REFRESH_KEY)
  sessionStorage.removeItem(REFRESH_EXPIRE_KEY)
}
