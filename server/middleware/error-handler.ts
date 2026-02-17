// SEC-001-007 §9.3 セキュリティエラーハンドリングミドルウェア
// セキュリティ関連エラー（400, 403, 429）を検出してログ記録

import { getHeader } from 'h3';
import { logSecurityEvent, SecurityEventType } from '../utils/security/security-events';

export default defineEventHandler((event) => {
  event.node.res.on('finish', () => {
    const statusCode = event.node.res.statusCode;

    // セキュリティ関連エラーをログ記録
    if ([400, 403, 429].includes(statusCode)) {
      logSecurityEvent(SecurityEventType.VALIDATION_ERROR, {
        statusCode,
        path: event.node.req.url,
        method: event.node.req.method,
        ip: getHeader(event, 'x-forwarded-for') ?? getHeader(event, 'x-real-ip') ?? 'unknown',
        userAgent: getHeader(event, 'user-agent') ?? 'unknown',
      });
    }
  });
});
