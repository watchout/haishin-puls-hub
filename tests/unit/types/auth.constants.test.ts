// AUTH-001 / ACCT-001: 定数・型定義のユニットテスト

import { describe, it, expect } from 'vitest';
import {
  ROLES,
  ROLE_REDIRECT_MAP,
  AUTH_ERROR_MESSAGES,
  SIGNUP_ERROR_MESSAGES,
} from '~/types/auth';
import type { Role } from '~/types/auth';

describe('ROLES', () => {
  it('10個のロールが定義されている', () => {
    expect(ROLES).toHaveLength(10);
  });

  it('全ロールが文字列', () => {
    for (const role of ROLES) {
      expect(typeof role).toBe('string');
    }
  });
});

describe('ROLE_REDIRECT_MAP', () => {
  it('全ロールにリダイレクト先が定義されている', () => {
    for (const role of ROLES) {
      expect(ROLE_REDIRECT_MAP[role as Role]).toBeDefined();
      expect(ROLE_REDIRECT_MAP[role as Role]).toMatch(/^\/app/);
    }
  });

  it('system_admin は /app/admin にリダイレクト', () => {
    expect(ROLE_REDIRECT_MAP.system_admin).toBe('/app/admin');
  });

  it('participant は /app/events にリダイレクト', () => {
    expect(ROLE_REDIRECT_MAP.participant).toBe('/app/events');
  });
});

describe('AUTH_ERROR_MESSAGES', () => {
  it('必要なエラーメッセージが全て定義されている', () => {
    expect(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS).toBeDefined();
    expect(AUTH_ERROR_MESSAGES.ACCOUNT_LOCKED).toBeDefined();
    expect(AUTH_ERROR_MESSAGES.ACCOUNT_DISABLED).toBeDefined();
    expect(AUTH_ERROR_MESSAGES.NO_TENANT).toBeDefined();
    expect(AUTH_ERROR_MESSAGES.RATE_LIMITED).toBeDefined();
    expect(AUTH_ERROR_MESSAGES.OAUTH_CANCELLED).toBeDefined();
    expect(AUTH_ERROR_MESSAGES.NETWORK_ERROR).toBeDefined();
    expect(AUTH_ERROR_MESSAGES.SERVER_ERROR).toBeDefined();
  });
});

describe('SIGNUP_ERROR_MESSAGES', () => {
  it('必要なエラーメッセージが全て定義されている', () => {
    expect(SIGNUP_ERROR_MESSAGES.EMAIL_ALREADY_EXISTS).toBeDefined();
    expect(SIGNUP_ERROR_MESSAGES.INVITATION_NOT_FOUND).toBeDefined();
    expect(SIGNUP_ERROR_MESSAGES.INVITATION_EXPIRED).toBeDefined();
    expect(SIGNUP_ERROR_MESSAGES.INVITATION_ALREADY_USED).toBeDefined();
    expect(SIGNUP_ERROR_MESSAGES.SIGNUP_FAILED).toBeDefined();
  });
});
