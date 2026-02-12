// SEC-001-007 セキュリティイベントログ
// 仕様書: docs/design/features/common/SEC-001-007_security.md §8.3

/**
 * セキュリティイベント種別
 */
export enum SecurityEventType {
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  CSRF_VIOLATION = 'csrf_violation',
  INVALID_ORIGIN = 'invalid_origin',
  VALIDATION_ERROR = 'validation_error',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  XSS_ATTEMPT = 'xss_attempt',
}

/** 高重大度イベント（即時通知対象） */
const HIGH_SEVERITY_EVENTS: SecurityEventType[] = [
  SecurityEventType.SQL_INJECTION_ATTEMPT,
  SecurityEventType.XSS_ATTEMPT,
];

/**
 * セキュリティイベントを記録
 * 高重大度イベントは即時通知（将来的にSlack/メール連携）
 *
 * @param type - セキュリティイベント種別
 * @param metadata - 付加情報（IP, パス, UA等）
 */
export function logSecurityEvent(
  type: SecurityEventType,
  metadata: Record<string, unknown>,
): void {
  const event = {
    type,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  // ログ出力
  console.warn('[SECURITY]', JSON.stringify(event));

  // 高重大度イベントは即時通知
  if (HIGH_SEVERITY_EVENTS.includes(type)) {
    // TODO: Slack/メール通知を実装
    console.error('[SECURITY:HIGH]', JSON.stringify(event));
  }
}
