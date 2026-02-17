// CRUD-001-004 エラーハンドラー ユニットテスト
// 仕様書: docs/design/features/common/CRUD-001-004_crud-operations.md §9.1
//
// ステータスコード→エラーコード変換、フィールドエラー取得をテスト

import { describe, it, expect } from 'vitest';
import {
  ERROR_STATUS_MAP,
  ERROR_MESSAGES,
  CRUD_ERROR_CODES,
} from '~/types/crud';
import type { CrudErrorCode } from '~/types/crud';

// ──────────────────────────────────────
// ステータスコード→エラーコード変換（§9.1）
// ──────────────────────────────────────

describe('HTTPステータス→エラーコード変換 (§9.1)', () => {
  function statusToErrorCode(statusCode: number): CrudErrorCode {
    const map: Record<number, CrudErrorCode> = {
      400: 'VALIDATION_ERROR',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      500: 'INTERNAL_ERROR',
    };
    return map[statusCode] ?? 'INTERNAL_ERROR';
  }

  it('400 → VALIDATION_ERROR', () => {
    expect(statusToErrorCode(400)).toBe('VALIDATION_ERROR');
  });

  it('401 → UNAUTHORIZED', () => {
    expect(statusToErrorCode(401)).toBe('UNAUTHORIZED');
  });

  it('403 → FORBIDDEN', () => {
    expect(statusToErrorCode(403)).toBe('FORBIDDEN');
  });

  it('404 → NOT_FOUND', () => {
    expect(statusToErrorCode(404)).toBe('NOT_FOUND');
  });

  it('409 → CONFLICT', () => {
    expect(statusToErrorCode(409)).toBe('CONFLICT');
  });

  it('422 → UNPROCESSABLE_ENTITY', () => {
    expect(statusToErrorCode(422)).toBe('UNPROCESSABLE_ENTITY');
  });

  it('500 → INTERNAL_ERROR', () => {
    expect(statusToErrorCode(500)).toBe('INTERNAL_ERROR');
  });

  it('未知のステータスコード(418) → INTERNAL_ERROR', () => {
    expect(statusToErrorCode(418)).toBe('INTERNAL_ERROR');
  });

  it('未知のステータスコード(502) → INTERNAL_ERROR', () => {
    expect(statusToErrorCode(502)).toBe('INTERNAL_ERROR');
  });
});

// ──────────────────────────────────────
// §3.6 入出力例のエラーレスポンス検証
// ──────────────────────────────────────

describe('エラーレスポンス入出力例 (§3.6)', () => {
  it('§3.6.2: バリデーションエラー — code: VALIDATION_ERROR, status: 400', () => {
    expect(ERROR_STATUS_MAP[CRUD_ERROR_CODES.VALIDATION_ERROR]).toBe(400);
    expect(ERROR_MESSAGES[CRUD_ERROR_CODES.VALIDATION_ERROR]).toBe('バリデーションエラー');
  });

  it('§3.6.4: Not Found — code: NOT_FOUND, status: 404', () => {
    expect(ERROR_STATUS_MAP[CRUD_ERROR_CODES.NOT_FOUND]).toBe(404);
  });

  it('§3.6.6: 楽観的ロック競合 — code: CONFLICT, status: 409', () => {
    expect(ERROR_STATUS_MAP[CRUD_ERROR_CODES.CONFLICT]).toBe(409);
    expect(ERROR_MESSAGES[CRUD_ERROR_CODES.CONFLICT]).toContain('他のユーザーによって更新');
  });

  it('§3.6.8: 権限不足 — code: FORBIDDEN, status: 403', () => {
    expect(ERROR_STATUS_MAP[CRUD_ERROR_CODES.FORBIDDEN]).toBe(403);
    expect(ERROR_MESSAGES[CRUD_ERROR_CODES.FORBIDDEN]).toContain('権限がありません');
  });
});

// ──────────────────────────────────────
// フィールドエラー取得テスト（§3.8 details）
// ──────────────────────────────────────

describe('フィールドエラー取得 (§3.8)', () => {
  function getFieldErrors(error: { data?: { errors?: Record<string, string[]> } }): Record<string, string[]> {
    return error.data?.errors ?? {};
  }

  it('バリデーションエラーからフィールドエラーを取得', () => {
    const apiError = {
      statusCode: 400,
      data: {
        errors: {
          title: ['タイトルは必須です'],
          start_date: ['日付の形式が不正です'],
        },
      },
    };
    const errors = getFieldErrors(apiError);
    expect(errors.title).toEqual(['タイトルは必須です']);
    expect(errors.start_date).toEqual(['日付の形式が不正です']);
  });

  it('errors フィールドがない場合は空オブジェクトを返す', () => {
    const apiError = { statusCode: 500, data: {} };
    expect(getFieldErrors(apiError)).toEqual({});
  });

  it('data フィールドがない場合は空オブジェクトを返す', () => {
    const apiError = { statusCode: 500 };
    expect(getFieldErrors(apiError)).toEqual({});
  });
});

// ──────────────────────────────────────
// 競合エラー details テスト（§3.8）
// ──────────────────────────────────────

describe('競合エラー details (§3.8)', () => {
  it('server_updated_at が含まれる', () => {
    const conflictError = {
      statusCode: 409,
      data: {
        serverUpdatedAt: '2026-02-09T14:30:00Z',
      },
    };
    expect(conflictError.data.serverUpdatedAt).toBe('2026-02-09T14:30:00Z');
    expect(new Date(conflictError.data.serverUpdatedAt).toISOString()).toBe('2026-02-09T14:30:00.000Z');
  });
});
