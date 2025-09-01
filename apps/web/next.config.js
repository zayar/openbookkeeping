/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  // Development configuration (comment out for Firebase hosting)
  // output: 'export',
  // trailingSlash: true,
  // images: {
  //   unoptimized: true,
  // },
  env: {
    BFF_URL: process.env.BFF_URL || 'http://localhost:3001',
  },
  async rewrites() {
    // Development API rewrites to BFF server
    return [
      {
        source: '/api/bff/:path*',
        destination: `${process.env.BFF_URL || 'http://localhost:3001'}/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${process.env.BFF_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig