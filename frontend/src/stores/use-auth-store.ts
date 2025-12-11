import { create } from 'zustand'
import { toast } from 'react-hot-toast'
import { PAGE_TEXT } from '@/lib/constants'
import { type User } from '@/types'

type AuthState = {
  user: User | null
  loading: boolean
  login: () => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  login: async () => {
    set({ loading: true })
    try {
      const fakeUser: User = {
        id: 'u1',
        name: '演示账号',
        email: 'demo@thinking-calendar.com'
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
