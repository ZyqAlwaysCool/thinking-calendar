import { create } from 'zustand'
import { toast } from 'react-hot-toast'
import { PAGE_TEXT } from '@/lib/constants'
import { type User } from '@/types'

type AuthState = {
  user: User | null
  loading: boolean
  login: (payload: { username: string; password: string }) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  login: async ({ username, password }) => {
    if (!username || !password) {
      toast.error(PAGE_TEXT.loginRequired)
      return
    }
    set({ loading: true })
    try {
      const fakeUser: User = {
        id: username,
        name: username,
        email: `${username}@thinking-calendar.com`
      }
      await new Promise(resolve => setTimeout(resolve, 400))
      set({ user: fakeUser, loading: false })
      toast.success(PAGE_TEXT.loginSuccess)
    } catch (error) {
      set({ loading: false })
      toast.error(PAGE_TEXT.loginFail)
      throw error
    }
  },
  logout: () => set({ user: null })
}))
