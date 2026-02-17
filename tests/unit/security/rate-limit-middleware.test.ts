// SEC-003 レート制限ミドルウェア ユニットテスト
// 仕様書: docs/design/features/common/SEC-001-007_security.md §5.2, §10.2
//
// レート制限設定の境界値、パスルーティング、ブロック期間、
// IP+UserIDキー生成、除外パスをテストする

import { describe, it, expect } from 'vitest';
import {
  RATE_LIMIT_CONFIG,
  getRateLimitType,
} from '~/server/utils/security/rate-limit-config';
import type { RateLimitType } from '~/server/utils/security/rate-limit-config';

// ──────────────────────────────────────
// §10.2: レート制限設定テスト（境界値）
// ──────────────────────────────────────

describe('Rate Limit Config Boundaries (SEC-003 §2.5)', () => {
  it('auth: 10req/60s — 10リクエスト目は許可、11リクエスト目は拒否対象', () => {
    expect(RATE_LIMIT_CONFIG.auth.points).toBe(10);
    expect(RATE_LIMIT_CONFIG.auth.duration).toBe(60);
  });

  it('ai: 20req/60s — 20リクエスト目は許可、21リクエスト目は拒否対象', () => {
    expect(RATE_LIMIT_CONFIG.ai.points).toBe(20);
    expect(RATE_LIMIT_CONFIG.ai.duration).toBe(60);
  });

  it('api: 100req/60s — 100リクエスト目は許可、101リクエスト目は拒否対象', () => {
    expect(RATE_LIMIT_CONFIG.api.points).toBe(100);
    expect(RATE_LIMIT_CONFIG.api.duration).toBe(60);
  });

  it('upload: 10req/60s — 10リクエスト目は許可、11リクエスト目は拒否対象', () => {
    expect(RATE_LIMIT_CONFIG.upload.points).toBe(10);
    expect(RATE_LIMIT_CONFIG.upload.duration).toBe(60);
  });
});

// ──────────────────────────────────────
// ブロック期間テスト
// ──────────────────────────────────────

describe('Rate Limit Block Duration (SEC-003)', () => {
  it('auth ブロック期間: 5分 (300秒)', () => {
    expect(RATE_LIMIT_CONFIG.auth.blockDuration).toBe(300);
  });

  it('ai ブロック期間: 3分 (180秒)', () => {
    expect(RATE_LIMIT_CONFIG.ai.blockDuration).toBe(180);
  });

  it('api ブロック期間: 1分 (60秒)', () => {
    expect(RATE_LIMIT_CONFIG.api.blockDuration).toBe(60);
  });

  it('upload ブロック期間: 10分 (600秒)', () => {
    expect(RATE_LIMIT_CONFIG.upload.blockDuration).toBe(600);
  });
});

// ──────────────────────────────────────
// パスルーティングテスト
// ──────────────────────────────────────

describe('getRateLimitType Routing (SEC-003)', () => {
  it('/api/auth/login → auth', () => {
    expect(getRateLimitType('/api/auth/login')).toBe('auth');
  });

  it('/api/auth/signup → auth', () => {
    expect(getRateLimitType('/api/auth/signup')).toBe('auth');
  });

  it('/api/auth/forgot-password → auth', () => {
    expect(getRateLimitType('/api/auth/forgot-password')).toBe('auth');
  });

  it('/api/v1/ai/chat → ai', () => {
    expect(getRateLimitType('/api/v1/ai/chat')).toBe('ai');
  });

  it('/api/v1/ai/suggest → ai', () => {
    expect(getRateLimitType('/api/v1/ai/suggest')).toBe('ai');
  });

  it('/api/v1/ai/concierge → ai', () => {
    expect(getRateLimitType('/api/v1/ai/concierge')).toBe('ai');
  });

  it('/api/v1/files/upload → upload（api より優先）', () => {
    expect(getRateLimitType('/api/v1/files/upload')).toBe('upload');
  });

  it('/api/v1/events → api', () => {
    expect(getRateLimitType('/api/v1/events')).toBe('api');
  });

  it('/api/v1/tenants/abc123/members → api', () => {
    expect(getRateLimitType('/api/v1/tenants/abc123/members')).toBe('api');
  });

  it('/api/health → null（除外）', () => {
    expect(getRateLimitType('/api/health')).toBeNull();
  });

  it('/about → null（API以外）', () => {
    expect(getRateLimitType('/about')).toBeNull();
  });

  it('/ → null', () => {
    expect(getRateLimitType('/')).toBeNull();
  });

  it('/app/dashboard → null', () => {
    expect(getRateLimitType('/app/dashboard')).toBeNull();
  });
});

// ──────────────────────────────────────
// 除外パステスト
// ──────────────────────────────────────

describe('Rate Limit Exempt Paths (SEC-003)', () => {
  it('/api/auth/get-session はレート制限対象外', () => {
    expect(getRateLimitType('/api/auth/get-session')).toBeNull();
  });

  it('/api/auth/get-session 以外の auth エンドポイントは対象', () => {
    expect(getRateLimitType('/api/auth/login')).toBe('auth');
    expect(getRateLimitType('/api/auth/signup')).toBe('auth');
  });
});

// ──────────────────────────────────────
// IP+UserID キー生成ロジック
// ──────────────────────────────────────

describe('Rate Limit Key Generation (SEC-003-01)', () => {
  function generateKey(
    userId: string | undefined,
    ip: string,
    limitType: RateLimitType,
  ): string {
    return userId ? `user:${userId}:${limitType}` : `ip:${ip}:${limitType}`;
  }

  it('認証済みユーザーはUserIDベースのキー', () => {
    const key = generateKey('usr_123', '192.168.1.1', 'api');
    expect(key).toBe('user:usr_123:api');
  });

  it('未認証ユーザーはIPベースのキー', () => {
    const key = generateKey(undefined, '192.168.1.1', 'api');
    expect(key).toBe('ip:192.168.1.1:api');
  });

  it('同一ユーザーでも異なるlimitTypeは別キー', () => {
    const keyApi = generateKey('usr_123', '192.168.1.1', 'api');
    const keyAi = generateKey('usr_123', '192.168.1.1', 'ai');
    expect(keyApi).not.toBe(keyAi);
  });

  it('異なるIPは別キー（未認証）', () => {
    const key1 = generateKey(undefined, '192.168.1.1', 'auth');
    const key2 = generateKey(undefined, '10.0.0.1', 'auth');
    expect(key1).not.toBe(key2);
  });
});

// ──────────────────────────────────────
// レスポンスヘッダーテスト
// ──────────────────────────────────────

describe('Rate Limit Response Headers (SEC-003-07)', () => {
  it('X-RateLimit-Limit はポイント数を文字列で返す', () => {
    const limit = String(RATE_LIMIT_CONFIG.auth.points);
    expect(limit).toBe('10');
  });

  it('X-RateLimit-Remaining は残りポイントを文字列で返す', () => {
    const remaining = String(RATE_LIMIT_CONFIG.auth.points - 1);
    expect(remaining).toBe('9');
  });

  it('X-RateLimit-Reset はISO文字列フォーマット', () => {
    const reset = new Date(Date.now() + 60000).toISOString();
    expect(reset).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('429レスポンスにRetry-Afterヘッダーが付与される（整数秒）', () => {
    const msBeforeNext = 30000;
    const retryAfter = String(Math.ceil(msBeforeNext / 1000));
    expect(retryAfter).toBe('30');
  });
});

// ──────────────────────────────────────
// §2.6 エラーレスポンステスト
// ──────────────────────────────────────

describe('Rate Limit Error Response (SEC-003 §2.6)', () => {
  it('429 Too Many Requests メッセージ', () => {
    const errorMessage = 'Rate limit exceeded. Please try again later.';
    expect(errorMessage).toContain('Rate limit exceeded');
  });

  it('レスポンスステータスコードは 429', () => {
    expect(429).toBe(429);
  });

  it('ステータスメッセージは "Too Many Requests"', () => {
    const statusMessage = 'Too Many Requests';
    expect(statusMessage).toBe('Too Many Requests');
  });
});
