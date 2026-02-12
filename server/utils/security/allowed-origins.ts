// SEC-002 CORS許可オリジン設定
// 仕様書: docs/design/features/common/SEC-001-007_security.md §4.3

export const ALLOWED_ORIGINS = {
  development: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ],
  production: [
    'https://haishin-plus-hub.com',
    'https://www.haishin-plus-hub.com',
  ],
} as const;

/**
 * 現在の環境で許可されたオリジンリストを取得
 * 開発環境では本番+開発オリジンの両方を許可
 */
export function getAllowedOrigins(): string[] {
  const env = process.env.NODE_ENV || 'development';
  return env === 'production'
    ? [...ALLOWED_ORIGINS.production]
    : [...ALLOWED_ORIGINS.production, ...ALLOWED_ORIGINS.development];
}
