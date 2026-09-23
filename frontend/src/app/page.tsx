'use client'

import { useRouter } from 'next/navigation'
import { PAGE_TEXT } from '@/lib/constants'
import { useAuthStore } from '@/stores/use-auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'
import { MorphIcon } from 'morphicons/react'

const LoginPage = () => {
  const router = useRouter()
  const { login, loading, user, restoreSession, initializing } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    void restoreSession()
  }, [restoreSession])

  useEffect(() => {
    if (!initializing && user) router.replace('/today')
  }, [user, router, initializing])

  const handleLogin = async () => {
    const trimmedUsername = username.trim()
    const trimmedPassword = password.trim()
    if (!trimmedUsername || !trimmedPassword) {
      toast.error(PAGE_TEXT.loginRequired)
      return
    }
    if (trimmedUsername.length < 6 || trimmedUsername.length > 20) {
      toast.error(PAGE_TEXT.loginUsernameLength)
      return
    }
    if (trimmedPassword.length < 6 || trimmedPassword.length > 32) {
      toast.error(PAGE_TEXT.loginPasswordLength)
      return
    }
    try {
      await login({ username: trimmedUsername, password: trimmedPassword })
      router.push('/today')
    } catch {}
  }

  if (!mounted || initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa] px-5 dark:bg-gray-950">
        <div className="w-full max-w-[380px] space-y-6">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafafa] px-5 dark:bg-gray-950">
      <div className="mx-auto flex min-h-screen max-w-[1080px] items-center">
        <div className="grid w-full gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center">
          <div className="hidden max-w-xl lg:block">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-400">Thinking Calendar</div>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.03em] text-gray-950 dark:text-gray-50">
              记录每天的工作，
              <br />
              留下可以回看的脉络。
            </h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-gray-500 dark:text-gray-400">
              写下当天的重点，在历史里找回细节，在周期结束时整理成周报、月报和年报。
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm dark:border-gray-800 dark:bg-gray-950 sm:p-8">
            <div className="mb-7">
              <div className="text-xl font-semibold tracking-tight text-gray-950 dark:text-gray-50">登录</div>
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">{PAGE_TEXT.loginHelp}</div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-300">用户名</label>
                <Input
                  placeholder={PAGE_TEXT.usernamePlaceholder}
                  value={username}
                  onChange={event => setUsername(event.target.value)}
                  onKeyDown={event => { if (event.key === 'Enter') void handleLogin() }}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-300">密码</label>
                <div className="relative">
                  <Input
                    placeholder={PAGE_TEXT.passwordPlaceholder}
                    type={passwordVisible ? 'text' : 'password'}
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    onKeyDown={event => { if (event.key === 'Enter') void handleLogin() }}
                    className="pr-11"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    aria-label={passwordVisible ? PAGE_TEXT.hidePassword : PAGE_TEXT.showPassword}
                    onClick={() => setPasswordVisible(current => !current)}
                  >
                    <MorphIcon icon={passwordVisible ? EyeOff : Eye} size={17} reducedMotion="user" />
                  </Button>
                </div>
              </div>

              <Button size="lg" className="mt-2 w-full" onClick={() => { void handleLogin() }} disabled={loading}>
                {loading ? PAGE_TEXT.loading : PAGE_TEXT.loginButton}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
