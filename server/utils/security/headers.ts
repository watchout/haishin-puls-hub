// SEC-006/SEC-007 セキュリティヘッダー設定
// 仕様書: docs/design/features/common/SEC-001-007_security.md §4.2

/**
 * 全レスポンスに付与するセキュリティヘッダー
 */
export const SECURITY_HEADERS: Record<string, string> = {
  // XSS対策 (SEC-006)
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',

  // HTTPS強制 (SEC-007) ※本番環境のみ有効
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',

  // CSP (SEC-006) - Nuxt/Vue のインラインスクリプト制約を考慮
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.anthropic.com",
    "frame-ancestors 'none'",
  ].join('; '),

  // その他
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * 環境に応じたセキュリティヘッダーを取得
 * 開発環境では HSTS を除外する
 */
export function getSecurityHeaders(): Record<string, string> {
  const env = process.env.NODE_ENV || 'development';

  if (env === 'production') {
    return { ...SECURITY_HEADERS };
  }

  // 開発環境: HSTS を除外（HTTPで開発するため）
  const { 'Strict-Transport-Security': _hsts, ...devHeaders } = SECURITY_HEADERS;
  return devHeaders;
}
