import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Cloudflare Pages (next-on-pages) 用
  // Edge Runtime で動作させるための設定
  experimental: {
    // Server Actions を有効化
  },
  // ローカル開発時のクロスオリジンアクセスを許可（サンドボックス環境用）
  allowedDevOrigins: [
    '*.sandbox.novita.ai',
    'localhost',
    '127.0.0.1',
  ],
};

export default nextConfig;
