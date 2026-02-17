// CRUD-001-004 共通型・スキーマ・定数テスト
// 仕様書: docs/design/features/common/CRUD-001-004_crud-operations.md §3.7, §3.8

import { describe, it, expect } from 'vitest';
import {
  CRUD_ERROR_CODES,
  ERROR_STATUS_MAP,
  ERROR_MESSAGES,
  TOAST_CONFIG,
  paginationSchema,
  ulidParamSchema,
  optimisticLockSchema,
} from '~/types/crud';

// ──────────────────────────────────────
// §3.8 エラーコード定義
// ──────────────────────────────────────

describe('CRUD_ERROR_CODES (§3.8)', () => {
  it('全8種類のエラーコードが定義されている', () => {
    expect(Object.keys(CRUD_ERROR_CODES)).toHaveLength(8);
  });

  it.each([
    ['VALIDATION_ERROR', 400],
    ['UNAUTHORIZED', 401],
    ['FORBIDDEN', 403],
    ['TENANT_MISMATCH', 403],
    ['NOT_FOUND', 404],
    ['CONFLICT', 409],
    ['UNPROCESSABLE_ENTITY', 422],
    ['INTERNAL_ERROR', 500],
  ] as const)('エラーコード %s は HTTPステータス %d にマッピング', (code, status) => {
    expect(ERROR_STATUS_MAP[code]).toBe(status);
  });

  it('全エラーコードに日本語メッセージがある', () => {
    const codes = Object.keys(CRUD_ERROR_CODES) as (keyof typeof CRUD_ERROR_CODES)[];
    codes.forEach((code) => {
      expect(ERROR_MESSAGES[code]).toBeDefined();
      expect(typeof ERROR_MESSAGES[code]).toBe('string');
      expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0);
    });
  });
});

// ──────────────────────────────────────
// §3.8 エラーメッセージ内容
// ──────────────────────────────────────

describe('ERROR_MESSAGES (§3.8)', () => {
  it('VALIDATION_ERROR: "バリデーションエラー"', () => {
    expect(ERROR_MESSAGES.VALIDATION_ERROR).toBe('バリデーションエラー');
  });

  it('UNAUTHORIZED: "認証が必要です"', () => {
    expect(ERROR_MESSAGES.UNAUTHORIZED).toBe('認証が必要です');
  });

  it('FORBIDDEN: "この操作を実行する権限がありません"', () => {
    expect(ERROR_MESSAGES.FORBIDDEN).toBe('この操作を実行する権限がありません');
  });

  it('NOT_FOUND: "リソースが見つかりません"', () => {
    expect(ERROR_MESSAGES.NOT_FOUND).toBe('リソースが見つかりません');
  });

  it('CONFLICT: 楽観的ロック競合メッセージを含む', () => {
    expect(ERROR_MESSAGES.CONFLICT).toContain('他のユーザーによって更新');
  });

  it('INTERNAL_ERROR: "内部サーバーエラー"', () => {
    expect(ERROR_MESSAGES.INTERNAL_ERROR).toBe('内部サーバーエラー');
  });
});

// ──────────────────────────────────────
// §3.7 ページネーションスキーマ境界値
// ──────────────────────────────────────

describe('paginationSchema (§3.7)', () => {
  it('デフォルト値: page=1, perPage=20', () => {
    const result = paginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.perPage).toBe(20);
  });

  it('page: 最小値 1 で成功', () => {
    const result = paginationSchema.parse({ page: 1 });
    expect(result.page).toBe(1);
  });

  it('page: 0 はエラー', () => {
    const result = paginationSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it('page: 負数はエラー', () => {
    const result = paginationSchema.safeParse({ page: -1 });
    expect(result.success).toBe(false);
  });

  it('perPage: 最小値 1 で成功', () => {
    const result = paginationSchema.parse({ perPage: 1 });
    expect(result.perPage).toBe(1);
  });

  it('perPage: 最大値 100 で成功', () => {
    const result = paginationSchema.parse({ perPage: 100 });
    expect(result.perPage).toBe(100);
  });

  it('perPage: 101 はエラー（最大100超過）', () => {
    const result = paginationSchema.safeParse({ perPage: 101 });
    expect(result.success).toBe(false);
  });

  it('perPage: 0 はエラー', () => {
    const result = paginationSchema.safeParse({ perPage: 0 });
    expect(result.success).toBe(false);
  });

  it('文字列 "3" は数値に変換される (coerce)', () => {
    const result = paginationSchema.parse({ page: '3', perPage: '50' });
    expect(result.page).toBe(3);
    expect(result.perPage).toBe(50);
  });
});

// ──────────────────────────────────────
// §3.7 ULID パラメータスキーマ
// ──────────────────────────────────────

describe('ulidParamSchema (§3.7)', () => {
  it('26文字のULIDは成功', () => {
    const validUlid = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
    expect(ulidParamSchema.parse(validUlid)).toBe(validUlid);
  });

  it('25文字はエラー', () => {
    const result = ulidParamSchema.safeParse('01ARZ3NDEKTSV4RRFFQ69G5FA');
    expect(result.success).toBe(false);
  });

  it('27文字はエラー', () => {
    const result = ulidParamSchema.safeParse('01ARZ3NDEKTSV4RRFFQ69G5FAVX');
    expect(result.success).toBe(false);
  });

  it('空文字はエラー', () => {
    const result = ulidParamSchema.safeParse('');
    expect(result.success).toBe(false);
  });
});

// ──────────────────────────────────────
// §BR-004 楽観的ロックスキーマ
// ──────────────────────────────────────

describe('optimisticLockSchema (§BR-004)', () => {
  it('ISO 8601 形式で成功', () => {
    const result = optimisticLockSchema.parse({
      updatedAt: '2026-02-09T10:00:00Z',
    });
    expect(result.updatedAt).toBe('2026-02-09T10:00:00Z');
  });

  it('不正な日付形式はエラー', () => {
    const result = optimisticLockSchema.safeParse({
      updatedAt: 'invalid-date',
    });
    expect(result.success).toBe(false);
  });

  it('updatedAt がない場合はエラー', () => {
    const result = optimisticLockSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ──────────────────────────────────────
// §3.5 FR-022 トースト設定
// ──────────────────────────────────────

describe('TOAST_CONFIG (§3.5 FR-022)', () => {
  it('成功: 緑色、3秒', () => {
    expect(TOAST_CONFIG.success.color).toBe('green');
    expect(TOAST_CONFIG.success.timeout).toBe(3000);
  });

  it('エラー: 赤色、5秒', () => {
    expect(TOAST_CONFIG.error.color).toBe('red');
    expect(TOAST_CONFIG.error.timeout).toBe(5000);
  });

  it('情報: 青色、3秒', () => {
    expect(TOAST_CONFIG.info.color).toBe('blue');
    expect(TOAST_CONFIG.info.timeout).toBe(3000);
  });
});
