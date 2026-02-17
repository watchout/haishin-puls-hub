// SEC-001-007 セキュリティイベントログ ユニットテスト
// 仕様書: docs/design/features/common/SEC-001-007_security.md §8.3

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SecurityEventType, logSecurityEvent } from '~/server/utils/security/security-events';

// ──────────────────────────────────────
// SecurityEventType enum テスト
// ──────────────────────────────────────

describe('SecurityEventType enum (§8.3)', () => {
  it('RATE_LIMIT_EXCEEDED が定義されている', () => {
    expect(SecurityEventType.RATE_LIMIT_EXCEEDED).toBe('rate_limit_exceeded');
  });

  it('CSRF_VIOLATION が定義されている', () => {
    expect(SecurityEventType.CSRF_VIOLATION).toBe('csrf_violation');
  });

  it('INVALID_ORIGIN が定義されている', () => {
    expect(SecurityEventType.INVALID_ORIGIN).toBe('invalid_origin');
  });

  it('VALIDATION_ERROR が定義されている', () => {
    expect(SecurityEventType.VALIDATION_ERROR).toBe('validation_error');
  });

  it('SQL_INJECTION_ATTEMPT が定義されている', () => {
    expect(SecurityEventType.SQL_INJECTION_ATTEMPT).toBe('sql_injection_attempt');
  });

  it('XSS_ATTEMPT が定義されている', () => {
    expect(SecurityEventType.XSS_ATTEMPT).toBe('xss_attempt');
  });

  it('全6種類のイベントタイプが定義されている', () => {
    const eventTypes = Object.values(SecurityEventType);
    expect(eventTypes).toHaveLength(6);
  });
});

// ──────────────────────────────────────
// logSecurityEvent テスト
// ──────────────────────────────────────

describe('logSecurityEvent (§8.3)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('RATE_LIMIT_EXCEEDED はconsole.warnに記録される', () => {
    logSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, {
      path: '/api/auth/login',
      ip: '192.168.1.1',
      userId: 'anonymous',
      limitType: 'auth',
      limit: 10,
    });

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledWith('[SECURITY]', expect.stringContaining('rate_limit_exceeded'));
  });

  it('CSRF_VIOLATION はconsole.warnに記録される', () => {
    logSecurityEvent(SecurityEventType.CSRF_VIOLATION, {
      path: '/api/v1/events',
      method: 'POST',
      origin: 'https://evil.com',
      referer: 'none',
      ip: '10.0.0.1',
    });

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledWith('[SECURITY]', expect.stringContaining('csrf_violation'));
  });

  it('SQL_INJECTION_ATTEMPT は高重大度 → console.errorにも記録', () => {
    logSecurityEvent(SecurityEventType.SQL_INJECTION_ATTEMPT, {
      path: '/api/v1/events/search',
      input: "' OR '1'='1' --",
      ip: '10.0.0.1',
    });

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith('[SECURITY:HIGH]', expect.stringContaining('sql_injection_attempt'));
  });

  it('XSS_ATTEMPT は高重大度 → console.errorにも記録', () => {
    logSecurityEvent(SecurityEventType.XSS_ATTEMPT, {
      path: '/api/v1/events/123/memo',
      input: '<script>alert("XSS")</script>',
      ip: '10.0.0.1',
    });

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith('[SECURITY:HIGH]', expect.stringContaining('xss_attempt'));
  });

  it('VALIDATION_ERROR は通常重大度 → console.errorには記録されない', () => {
    logSecurityEvent(SecurityEventType.VALIDATION_ERROR, {
      statusCode: 400,
      path: '/api/v1/events',
      method: 'POST',
    });

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('INVALID_ORIGIN は通常重大度 → console.errorには記録されない', () => {
    logSecurityEvent(SecurityEventType.INVALID_ORIGIN, {
      path: '/api/v1/events',
      origin: 'https://evil.com',
      ip: '10.0.0.1',
    });

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('ログにtimestampが含まれる', () => {
    logSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, {
      path: '/api/auth/login',
    });

    const loggedString = warnSpy.mock.calls[0]?.[1] as string;
    expect(loggedString).toContain('timestamp');
  });

  it('metadataがログに含まれる', () => {
    logSecurityEvent(SecurityEventType.CSRF_VIOLATION, {
      customField: 'test-value',
    });

    const loggedString = warnSpy.mock.calls[0]?.[1] as string;
    expect(loggedString).toContain('test-value');
  });
});
