'use client'

import { useRouter } from 'next/navigation'
import { NAV_LABELS, PAGE_TEXT } from '@/lib/constants'
import { useAuthStore } from '@/stores/use-auth-store'
import { Button } from '@/components/ui/button'

const LoginPage = () => {
  const router = useRouter()
  const { login, loading } = useAuthStore()

  const handleLogin = async () => {
    try {
      await login()
      router.push('/today')
    } catch {
      // 已有 toast
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-[400px] rounded-3xl border border-gray-200 bg-gray-100 p-12 shadow-card transition-all duration-200 hover:scale-105 hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
        <div className="space-y-2 text-center">
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-50">{NAV_LABELS.brand}</div>
          <div className="text-gray-700 dark:text-gray-300">{PAGE_TEXT.loginSubtitle}</div>
        </div>
        <Button
          variant="outline"
          size="lg"
          className="mt-10 w-full"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? PAGE_TEXT.loading : PAGE_TEXT.loginButton}
        </Button>
      </div>
    </div>
  )
}

export default LoginPage
