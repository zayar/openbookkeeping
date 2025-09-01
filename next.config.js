/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    BFF_URL: process.env.BFF_URL || 'http://localhost:3001',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  async rewrites() {
    return [
      {
        source: '/api/bff/:path*',
        destination: `${process.env.BFF_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
