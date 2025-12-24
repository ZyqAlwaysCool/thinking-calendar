'use client'

import { useRouter } from 'next/navigation'
import { NAV_LABELS, PAGE_TEXT } from '@/lib/constants'
import { useAuthStore } from '@/stores/use-auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'

const LoginPage = () => {
  const router = useRouter()
  const { login, loading, user, restoreSession, initializing } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    void restoreSession()
  }, [restoreSession])

  useEffect(() => {
    if (!initializing && user) {
      router.replace('/today')
    }
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
    } catch {
      // 已有提示
    }
  }

  if (!mounted || initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-[400px] rounded-3xl border border-gray-200 bg-gray-100 p-12 shadow-card dark:border-gray-800 dark:bg-gray-900 transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
          <div className="space-y-2 text-center">
            <Skeleton className="mx-auto h-8 w-32" />
            <Skeleton className="mx-auto h-4 w-48" />
          </div>
          <div className="mt-8 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-[400px] rounded-3xl border border-gray-200 bg-gray-100 p-12 shadow-card dark:border-gray-800 dark:bg-gray-900 transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
        <div className="space-y-2 text-center">
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-50">{NAV_LABELS.brand}</div>
          <div className="text-gray-700 dark:text-gray-300">{PAGE_TEXT.loginSubtitle}</div>
        </div>
        <div className="mt-8 space-y-4">
          <Input
            placeholder={PAGE_TEXT.usernamePlaceholder}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input
            placeholder={PAGE_TEXT.passwordPlaceholder}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button size="lg" className="w-full" onClick={handleLogin} disabled={loading}>
            {loading ? PAGE_TEXT.loading : PAGE_TEXT.loginButton}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
