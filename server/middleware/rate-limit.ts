// SEC-003 レート制限ミドルウェア
// 仕様書: docs/design/features/common/SEC-001-007_security.md §5.2
//
// インメモリストアでレート制限を実装（SEC-TBD-01: 本番はRedis推奨）

import { getHeader, setResponseHeaders, createError } from 'h3';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { RATE_LIMIT_CONFIG, getRateLimitType } from '../utils/security/rate-limit-config';
import type { RateLimitType } from '../utils/security/rate-limit-config';
import { logSecurityEvent, SecurityEventType } from '../utils/security/security-events';

// ──────────────────────────────────────
// インメモリレート制限ストア初期化
// ──────────────────────────────────────

const limiters = new Map<RateLimitType, RateLimiterMemory>();

for (const [key, config] of Object.entries(RATE_LIMIT_CONFIG)) {
  limiters.set(key as RateLimitType, new RateLimiterMemory({
    points: config.points,
    duration: config.duration,
    blockDuration: config.blockDuration,
  }));
}

// ──────────────────────────────────────
// ミドルウェア
// ──────────────────────────────────────

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname;

  // ヘルスチェックはスキップ（§7.2 例外ルール）
  if (path === '/api/health') return;

  // レート制限タイプを判定
  const limitType = getRateLimitType(path);
  if (!limitType) return; // 対象外パス

  const limiter = limiters.get(limitType);
  if (!limiter) return;

  // IP アドレス取得
  const ip = getHeader(event, 'x-forwarded-for')
    ?? getHeader(event, 'x-real-ip')
    ?? event.node.req.socket.remoteAddress
    ?? 'unknown';

  // ユーザーID取得（認証済みの場合 — auth middleware が先に実行される想定）
  const authContext = event.context.auth as { userId?: string } | undefined;
  const userId = authContext?.userId;

  // IP + UserID でキーを生成（SEC-003-01: 二重制限）
  const key = userId ? `user:${userId}:${limitType}` : `ip:${ip}:${limitType}`;

  try {
    const rateLimitRes = await limiter.consume(key);

    // レート制限情報をヘッダーに追加（SEC-003-07）
    setResponseHeaders(event, {
      'X-RateLimit-Limit': String(RATE_LIMIT_CONFIG[limitType].points),
      'X-RateLimit-Remaining': String(rateLimitRes.remainingPoints),
      'X-RateLimit-Reset': new Date(Date.now() + rateLimitRes.msBeforeNext).toISOString(),
    });
  } catch (rejRes: unknown) {
    // レート制限超過（SEC-003-06）
    const rlError = rejRes as { msBeforeNext: number };
    const retryAfter = Math.ceil(rlError.msBeforeNext / 1000);

    setResponseHeaders(event, {
      'X-RateLimit-Limit': String(RATE_LIMIT_CONFIG[limitType].points),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': new Date(Date.now() + rlError.msBeforeNext).toISOString(),
      'Retry-After': String(retryAfter),
    });

    logSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, {
      path,
      ip,
      userId: userId ?? 'anonymous',
      limitType,
      limit: RATE_LIMIT_CONFIG[limitType].points,
    });

    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    });
  }
});
