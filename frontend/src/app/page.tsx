'use client'

import { useRouter } from 'next/navigation'
import { NAV_LABELS, PAGE_TEXT } from '@/lib/constants'
import { useAuthStore } from '@/stores/use-auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'

const LoginPage = () => {
  const router = useRouter()
  const { login, loading } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async () => {
    await login({ username, password })
    if (username && password) {
      router.push('/today')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-[400px] rounded-3xl border border-gray-200 bg-gray-100 p-12 shadow-card transition-all duration-200 hover:scale-105 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
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
