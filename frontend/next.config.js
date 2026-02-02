/** @type {import('next').NextConfig} */
const backendUrl = process.env.API_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'flagcdn.com', pathname: '/**' },
    ],
  },
  // Проксируем /api/* на бэкенд — cookies работают только при same-origin запросах (localhost:3000 ↔ localhost:3001 не шлёт cookies)
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backendUrl}/api/:path*` }];
  },
}

module.exports = nextConfig
