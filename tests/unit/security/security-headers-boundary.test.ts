// SEC-006/SEC-007 セキュリティヘッダー境界値テスト
// 仕様書: docs/design/features/common/SEC-001-007_security.md §4.2, §10.5, §10.6
//
// セキュリティヘッダーの全値、CSPディレクティブ、
// 環境別HSTS、Permissions-Policyの詳細検証

import { describe, it, expect, afterEach } from 'vitest';
import { SECURITY_HEADERS, getSecurityHeaders } from '~/server/utils/security/headers';

// ──────────────────────────────────────
// TC-SEC-006-05: セキュリティヘッダー存在確認
// ──────────────────────────────────────

describe('Security Headers Existence (TC-SEC-006-05)', () => {
  it('全7ヘッダーが定義されている', () => {
    const expectedHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Strict-Transport-Security',
      'Content-Security-Policy',
      'Referrer-Policy',
      'Permissions-Policy',
    ];

    expectedHeaders.forEach((header) => {
      expect(SECURITY_HEADERS).toHaveProperty(header);
    });
  });
});

// ──────────────────────────────────────
// XSS対策ヘッダー詳細テスト
// ──────────────────────────────────────

describe('XSS Protection Headers (SEC-006)', () => {
  it('X-Content-Type-Options: nosniff', () => {
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
  });

  it('X-Frame-Options: DENY（クリックジャッキング防止）', () => {
    expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
  });

  it('X-XSS-Protection: 1; mode=block', () => {
    expect(SECURITY_HEADERS['X-XSS-Protection']).toBe('1; mode=block');
  });
});

// ──────────────────────────────────────
// CSP ディレクティブ詳細テスト
// ──────────────────────────────────────

describe('Content-Security-Policy Directives (SEC-006)', () => {
  const csp = SECURITY_HEADERS['Content-Security-Policy'];

  it("default-src 'self' が設定されている", () => {
    expect(csp).toContain("default-src 'self'");
  });

  it("script-src に 'self' 'unsafe-inline' 'unsafe-eval' が設定されている", () => {
    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
  });

  it("style-src に 'self' 'unsafe-inline' が設定されている", () => {
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });

  it("img-src に 'self' data: https: が設定されている", () => {
    expect(csp).toContain("img-src 'self' data: https:");
  });

  it("font-src に 'self' data: が設定されている", () => {
    expect(csp).toContain("font-src 'self' data:");
  });

  it('connect-src に Claude API が許可されている', () => {
    expect(csp).toContain('connect-src');
    expect(csp).toContain('https://api.anthropic.com');
  });

  it("frame-ancestors 'none' でiframe埋め込みを拒否", () => {
    expect(csp).toContain("frame-ancestors 'none'");
  });
});

// ──────────────────────────────────────
// HSTS テスト (SEC-007)
// ──────────────────────────────────────

describe('HSTS Configuration (SEC-007)', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('max-age=31536000（1年間）が設定されている', () => {
    expect(SECURITY_HEADERS['Strict-Transport-Security']).toContain('max-age=31536000');
  });

  it('includeSubDomains が設定されている', () => {
    expect(SECURITY_HEADERS['Strict-Transport-Security']).toContain('includeSubDomains');
  });

  it('本番環境: HSTSヘッダーが含まれる', () => {
    process.env.NODE_ENV = 'production';
    const headers = getSecurityHeaders();
    expect(headers).toHaveProperty('Strict-Transport-Security');
  });

  it('開発環境: HSTSヘッダーが除外される（HTTP開発のため）', () => {
    process.env.NODE_ENV = 'development';
    const headers = getSecurityHeaders();
    expect(headers).not.toHaveProperty('Strict-Transport-Security');
  });

  it('開発環境: HSTS以外のヘッダーは全て含まれる', () => {
    process.env.NODE_ENV = 'development';
    const headers = getSecurityHeaders();
    expect(headers).toHaveProperty('X-Content-Type-Options');
    expect(headers).toHaveProperty('X-Frame-Options');
    expect(headers).toHaveProperty('X-XSS-Protection');
    expect(headers).toHaveProperty('Content-Security-Policy');
    expect(headers).toHaveProperty('Referrer-Policy');
    expect(headers).toHaveProperty('Permissions-Policy');
  });
});

// ──────────────────────────────────────
// Permissions-Policy テスト
// ──────────────────────────────────────

describe('Permissions-Policy (SEC-006)', () => {
  const policy = SECURITY_HEADERS['Permissions-Policy'];

  it('camera=() でカメラアクセスを拒否', () => {
    expect(policy).toContain('camera=()');
  });

  it('microphone=() でマイクアクセスを拒否', () => {
    expect(policy).toContain('microphone=()');
  });

  it('geolocation=() で位置情報アクセスを拒否', () => {
    expect(policy).toContain('geolocation=()');
  });
});

// ──────────────────────────────────────
// Referrer-Policy テスト
// ──────────────────────────────────────

describe('Referrer-Policy', () => {
  it('strict-origin-when-cross-origin が設定されている', () => {
    expect(SECURITY_HEADERS['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
  });
});
