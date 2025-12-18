export const TOKEN_KEY = 'tc_access_token'
export const EXPIRE_KEY = 'tc_access_expire'
export const USERNAME_KEY = 'tc_username'
export const PASSWORD_KEY = 'tc_password'

const load = (key: string, useSession?: boolean) => {
  if (typeof window === 'undefined') return ''
  if (useSession) return sessionStorage.getItem(key) || ''
  return localStorage.getItem(key) || ''
}

const save = (key: string, value: string, useSession?: boolean) => {
  if (typeof window === 'undefined') return
  if (useSession) {
    sessionStorage.setItem(key, value)
    return
  }
  localStorage.setItem(key, value)
}

export const loadAuthStorage = () => {
  if (typeof window === 'undefined') {
    return {
      token: '',
      expireAt: '',
      username: '',
      password: ''
    }
  }
  return {
    token: load(TOKEN_KEY, true),
    expireAt: load(EXPIRE_KEY, true),
    username: load(USERNAME_KEY, true),
    password: load(PASSWORD_KEY, true)
  }
}

export const saveAuthStorage = (payload: { token: string; expireAt: string; username: string; password: string }) => {
  if (typeof window === 'undefined') return
  save(TOKEN_KEY, payload.token, true)
  save(EXPIRE_KEY, payload.expireAt, true)
  save(USERNAME_KEY, payload.username, true)
  save(PASSWORD_KEY, payload.password, true)
}

export const clearAuthStorage = () => {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(EXPIRE_KEY)
  sessionStorage.removeItem(USERNAME_KEY)
  sessionStorage.removeItem(PASSWORD_KEY)
}

export const clearTokenStorage = () => {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(EXPIRE_KEY)
}
