// SEC-001-007 セキュリティ設定ユニットテスト
// 仕様書: docs/design/features/common/SEC-001-007_security.md §4

import { describe, it, expect, afterEach } from 'vitest';
import { getAllowedOrigins, ALLOWED_ORIGINS } from '~/server/utils/security/allowed-origins';
import { getSecurityHeaders, SECURITY_HEADERS } from '~/server/utils/security/headers';
import {
  RATE_LIMIT_CONFIG,
  getRateLimitType,
} from '~/server/utils/security/rate-limit-config';

// ──────────────────────────────────────
// SEC-002: CORS許可オリジン
// ──────────────────────────────────────

describe('CORS許可オリジン (SEC-002)', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('開発環境ではlocalhostオリジンが許可される', () => {
    process.env.NODE_ENV = 'development';
    const origins = getAllowedOrigins();
    expect(origins).toContain('http://localhost:3000');
    expect(origins).toContain('http://127.0.0.1:3000');
  });

  it('本番環境ではlocalhostオリジンが除外される', () => {
    process.env.NODE_ENV = 'production';
    const origins = getAllowedOrigins();
    expect(origins).not.toContain('http://localhost:3000');
    expect(origins).not.toContain('http://127.0.0.1:3000');
  });

  it('本番環境では正規ドメインのみ許可される', () => {
    process.env.NODE_ENV = 'production';
    const origins = getAllowedOrigins();
    expect(origins).toContain('https://haishin-plus-hub.com');
    expect(origins).toContain('https://www.haishin-plus-hub.com');
    expect(origins).toHaveLength(2);
  });

  it('開発環境では本番+開発オリジンの両方が含まれる', () => {
    process.env.NODE_ENV = 'development';
    const origins = getAllowedOrigins();
    expect(origins.length).toBe(
      ALLOWED_ORIGINS.production.length + ALLOWED_ORIGINS.development.length,
    );
  });
});

// ──────────────────────────────────────
// SEC-006/SEC-007: セキュリティヘッダー
// ──────────────────────────────────────

describe('セキュリティヘッダー (SEC-006/SEC-007)', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('必須セキュリティヘッダーが定義されている', () => {
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
    expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
    expect(SECURITY_HEADERS['X-XSS-Protection']).toBe('1; mode=block');
  });

  it('HSTSヘッダーが定義されている', () => {
    expect(SECURITY_HEADERS['Strict-Transport-Security']).toContain('max-age=31536000');
  });

  it('CSPヘッダーが定義されている', () => {
    expect(SECURITY_HEADERS['Content-Security-Policy']).toContain("default-src 'self'");
    expect(SECURITY_HEADERS['Content-Security-Policy']).toContain("frame-ancestors 'none'");
  });

  it('Referrer-Policyが設定されている', () => {
    expect(SECURITY_HEADERS['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
  });

  it('Permissions-Policyが設定されている', () => {
    expect(SECURITY_HEADERS['Permissions-Policy']).toContain('camera=()');
    expect(SECURITY_HEADERS['Permissions-Policy']).toContain('microphone=()');
  });

  it('本番環境ではHSTSが含まれる', () => {
    process.env.NODE_ENV = 'production';
    const headers = getSecurityHeaders();
    expect(headers['Strict-Transport-Security']).toBeDefined();
  });

  it('開発環境ではHSTSが除外される', () => {
    process.env.NODE_ENV = 'development';
    const headers = getSecurityHeaders();
    expect(headers['Strict-Transport-Security']).toBeUndefined();
  });
});

// ──────────────────────────────────────
// SEC-003: レート制限設定
// ──────────────────────────────────────

describe('レート制限設定 (SEC-003)', () => {
  it('認証APIは10req/分に制限される', () => {
    expect(RATE_LIMIT_CONFIG.auth.points).toBe(10);
    expect(RATE_LIMIT_CONFIG.auth.duration).toBe(60);
  });

  it('AI APIは20req/分に制限される', () => {
    expect(RATE_LIMIT_CONFIG.ai.points).toBe(20);
    expect(RATE_LIMIT_CONFIG.ai.duration).toBe(60);
  });

  it('一般APIは100req/分に制限される', () => {
    expect(RATE_LIMIT_CONFIG.api.points).toBe(100);
    expect(RATE_LIMIT_CONFIG.api.duration).toBe(60);
  });

  it('ファイルアップロードは10req/分に制限される', () => {
    expect(RATE_LIMIT_CONFIG.upload.points).toBe(10);
    expect(RATE_LIMIT_CONFIG.upload.duration).toBe(60);
  });

  it('認証APIのブロック期間は5分', () => {
    expect(RATE_LIMIT_CONFIG.auth.blockDuration).toBe(300);
  });
});

describe('getRateLimitType', () => {
  it('/api/auth/* は auth タイプ', () => {
    expect(getRateLimitType('/api/auth/login')).toBe('auth');
    expect(getRateLimitType('/api/auth/signup')).toBe('auth');
  });

  it('/api/v1/ai/* は ai タイプ', () => {
    expect(getRateLimitType('/api/v1/ai/chat')).toBe('ai');
    expect(getRateLimitType('/api/v1/ai/suggest')).toBe('ai');
  });

  it('/api/v1/files/upload は upload タイプ', () => {
    expect(getRateLimitType('/api/v1/files/upload')).toBe('upload');
  });

  it('/api/v1/* は api タイプ', () => {
    expect(getRateLimitType('/api/v1/events')).toBe('api');
    expect(getRateLimitType('/api/v1/tenants')).toBe('api');
  });

  it('対象外パスは null を返す', () => {
    expect(getRateLimitType('/api/health')).toBeNull();
    expect(getRateLimitType('/about')).toBeNull();
    expect(getRateLimitType('/')).toBeNull();
  });

  it('upload パスは api より優先される', () => {
    // /api/v1/files/upload は api にもマッチするが upload が優先
    expect(getRateLimitType('/api/v1/files/upload')).toBe('upload');
  });
});
