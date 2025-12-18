/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const defaultBase =
      process.env.NODE_ENV === 'production' ? 'http://localhost:8000/v1' : 'http://localhost:8999/v1'
    const backendBase =
      process.env.NEXT_PUBLIC_BACKEND_BASE ||
      process.env.BACKEND_BASE ||
      defaultBase
    return [
      {
        source: '/api/:path*',
        destination: `${backendBase}/:path*`
      }
    ]
  }
}

export default nextConfig
