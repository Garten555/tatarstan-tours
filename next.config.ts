import type { NextConfig } from 'next';
import { buildContentSecurityPolicy } from './lib/security/csp';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // Оптимизация производительности
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.twcstorage.ru',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75, 90],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Оптимизация сборки
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', '@supabase/supabase-js', 'framer-motion'],
  },
  // Разрешаем cross-origin запросы в dev режиме
  allowedDevOrigins: ['192.168.56.1'],
  async redirects() {
    return [
      {
        source: '/api/maintenance',
        destination: '/api/maintenance/status',
        permanent: false,
      },
      {
        source: '/api/maintenance/',
        destination: '/api/maintenance/status',
        permanent: false,
      },
      {
        source: '/api/tours',
        destination: '/api/tours/filter',
        permanent: false,
      },
      {
        source: '/api/tours/',
        destination: '/api/tours/filter',
        permanent: false,
      },
      {
        source: '/api/cities',
        destination: '/api/cities/featured',
        permanent: false,
      },
      {
        source: '/api/cities/',
        destination: '/api/cities/featured',
        permanent: false,
      },
    ];
  },
  async headers() {
    const securityHeaders = [
      { key: 'X-DNS-Prefetch-Control', value: 'off' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
      { key: 'X-Download-Options', value: 'noopen' },
      { key: 'Origin-Agent-Cluster', value: '?1' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
      {
        key: 'Content-Security-Policy',
        value: buildContentSecurityPolicy(),
      },
    ];

    if (process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://')) {
      securityHeaders.splice(8, 0, {
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      });
    }

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
