import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
  
  // Экспериментальные фичи Next.js 15
  experimental: {
    // Включено по умолчанию в Next.js 15
  },
  
  // Настройки для продакшена
  output: 'standalone',
};

export default nextConfig;
