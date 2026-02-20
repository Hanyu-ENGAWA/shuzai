import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Cloudflare Pages (next-on-pages) 用
  // Edge Runtime で動作させるための設定
  experimental: {
    // Server Actions を有効化
  },
};

export default nextConfig;
