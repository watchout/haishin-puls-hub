// SEC-001/SEC-002/SEC-006/SEC-007 セキュリティミドルウェア
// 仕様書: docs/design/features/common/SEC-001-007_security.md §5.1
//
// CORS設定、CSRF対策、セキュリティヘッダーを一元管理

import { getHeader, setResponseHeaders, createError } from 'h3';
import { getAllowedOrigins } from '../utils/security/allowed-origins';
import { getSecurityHeaders } from '../utils/security/headers';
import { logSecurityEvent, SecurityEventType } from '../utils/security/security-events';

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname;

  // 静的ファイルはスキップ（§7.2 例外ルール）
  if (path.startsWith('/_nuxt/') || path.startsWith('/assets/')) return;

  const method = event.method;
  const origin = getHeader(event, 'origin');
  const allowedOrigins = getAllowedOrigins();

  // 1. セキュリティヘッダーを設定（SEC-006, SEC-007）
  setResponseHeaders(event, getSecurityHeaders());

  // 2. CORS設定（SEC-002）
  if (origin && allowedOrigins.includes(origin)) {
    setResponseHeaders(event, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24時間キャッシュ
    });
  }

  // 3. OPTIONSプリフライト応答
  if (method === 'OPTIONS') {
    event.node.res.statusCode = 204;
    event.node.res.end();
    return;
  }

  // API以外はCSRFチェック不要
  if (!path.startsWith('/api/')) return;

  // Better Auth エンドポイントはスキップ（独自のCSRF対策あり）
  if (path.startsWith('/api/auth/')) return;

  // ヘルスチェックはスキップ
  if (path === '/api/health') return;

  // 4. CSRF対策: 状態変更APIでOrigin/Refererチェック（SEC-001）
  if (['POST', 'PATCH', 'DELETE'].includes(method)) {
    // Origin チェック
    if (origin && allowedOrigins.includes(origin)) {
      return; // 正当なOrigin → OK
    }

    // Origin がない場合は Referer フォールバック（SEC-001-04）
    const referer = getHeader(event, 'referer');
    const isValidReferer = referer && allowedOrigins.some(
      (allowed) => referer.startsWith(allowed),
    );

    if (isValidReferer) {
      return; // 正当なReferer → OK
    }

    // 両方不正 → 拒否
    logSecurityEvent(SecurityEventType.CSRF_VIOLATION, {
      path,
      method,
      origin: origin ?? 'none',
      referer: referer ?? 'none',
      ip: getHeader(event, 'x-forwarded-for') ?? getHeader(event, 'x-real-ip') ?? 'unknown',
    });

    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Invalid origin or referer',
    });
  }
});
