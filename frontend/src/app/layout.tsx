import './globals.css'
import { type Metadata } from 'next'
import { Providers } from './providers'
import { METADATA_TEXT } from '@/lib/constants'

export const metadata: Metadata = {
  title: METADATA_TEXT.title,
  description: METADATA_TEXT.description
}

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="zh-CN">
    <body className="min-h-screen bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <Providers>{children}</Providers>
    </body>
  </html>
)

export default RootLayout
