// SEC-003 レート制限設定
// 仕様書: docs/design/features/common/SEC-001-007_security.md §4.1

/**
 * レート制限設定
 * points: 時間窓内の許可リクエスト数
 * duration: 時間窓（秒）
 * blockDuration: 制限超過時のブロック期間（秒）
 */
export const RATE_LIMIT_CONFIG = {
  /** /api/auth/* - 認証API（10req/分） */
  auth: {
    points: 10,
    duration: 60,
    blockDuration: 300,
  },
  /** /api/v1/ai/* - AI API（20req/分） */
  ai: {
    points: 20,
    duration: 60,
    blockDuration: 180,
  },
  /** /api/v1/* - 一般API（100req/分） */
  api: {
    points: 100,
    duration: 60,
    blockDuration: 60,
  },
  /** /api/v1/files/upload - ファイルアップロード（10req/分） */
  upload: {
    points: 10,
    duration: 60,
    blockDuration: 600,
  },
} as const;

export type RateLimitType = keyof typeof RATE_LIMIT_CONFIG;

/**
 * レート制限を除外するパス
 * get-session はセッション確認（読み取り専用）でリクエスト頻度が高いため除外
 */
const RATE_LIMIT_EXEMPT_PATHS = [
  '/api/auth/get-session',
] as const;

/**
 * リクエストパスからレート制限タイプを判定
 */
export function getRateLimitType(path: string): RateLimitType | null {
  // 除外パスはレート制限対象外
  if (RATE_LIMIT_EXEMPT_PATHS.some((exempt) => path === exempt)) return null;

  if (path.startsWith('/api/auth/')) return 'auth';
  if (path.startsWith('/api/v1/ai/')) return 'ai';
  if (path.startsWith('/api/v1/files/upload')) return 'upload';
  if (path.startsWith('/api/v1/')) return 'api';
  return null;
}
