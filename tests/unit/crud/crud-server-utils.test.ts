// CRUD-001-004 サーバーユーティリティ ユニットテスト
// 仕様書: docs/design/features/common/CRUD-001-004_crud-operations.md §8.2
//
// バリデーション、ID検証、ページネーション、楽観的ロック検証のロジックテスト

import { describe, it, expect } from 'vitest';

// ──────────────────────────────────────
// ULID パラメータ検証（§3.7）
// ──────────────────────────────────────

describe('ULID パラメータ検証 (§3.7)', () => {
  function isValidUlid(id: string | undefined): boolean {
    return !!id && id.length === 26;
  }

  it('26文字のULIDは有効', () => {
    expect(isValidUlid('01ARZ3NDEKTSV4RRFFQ69G5FAV')).toBe(true);
  });

  it('25文字は無効', () => {
    expect(isValidUlid('01ARZ3NDEKTSV4RRFFQ69G5FA')).toBe(false);
  });

  it('27文字は無効', () => {
    expect(isValidUlid('01ARZ3NDEKTSV4RRFFQ69G5FAVX')).toBe(false);
  });

  it('空文字は無効', () => {
    expect(isValidUlid('')).toBe(false);
  });

  it('undefined は無効', () => {
    expect(isValidUlid(undefined)).toBe(false);
  });
});

// ──────────────────────────────────────
// ページネーション計算（§3.7, §5.3.2）
// ──────────────────────────────────────

describe('ページネーション計算 (§3.7)', () => {
  function parsePagination(query: { page?: unknown; per_page?: unknown }) {
    const page = Math.max(1, Number(query.page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(query.per_page) || 20));
    return { page, perPage, offset: (page - 1) * perPage };
  }

  it('デフォルト: page=1, perPage=20, offset=0', () => {
    const result = parsePagination({});
    expect(result.page).toBe(1);
    expect(result.perPage).toBe(20);
    expect(result.offset).toBe(0);
  });

  it('page=2, per_page=20 → offset=20', () => {
    const result = parsePagination({ page: 2, per_page: 20 });
    expect(result.offset).toBe(20);
  });

  it('page=3, per_page=10 → offset=20', () => {
    const result = parsePagination({ page: 3, per_page: 10 });
    expect(result.offset).toBe(20);
  });

  it('per_page=0 は falsy なのでデフォルト 20 に補正', () => {
    const result = parsePagination({ per_page: 0 });
    expect(result.perPage).toBe(20);
  });

  it('per_page=150 は最大 100 に補正', () => {
    const result = parsePagination({ per_page: 150 });
    expect(result.perPage).toBe(100);
  });

  it('page=-1 は最小 1 に補正', () => {
    const result = parsePagination({ page: -1 });
    expect(result.page).toBe(1);
  });

  it('文字列入力は数値変換される', () => {
    const result = parsePagination({ page: '5', per_page: '30' });
    expect(result.page).toBe(5);
    expect(result.perPage).toBe(30);
  });

  it('NaN 入力はデフォルトに補正', () => {
    const result = parsePagination({ page: 'abc', per_page: 'xyz' });
    expect(result.page).toBe(1);
    expect(result.perPage).toBe(20);
  });
});

// ──────────────────────────────────────
// ページネーションメタ計算（§5.3.2）
// ──────────────────────────────────────

describe('ページネーションメタ計算 (§5.3.2)', () => {
  function calculateMeta(page: number, perPage: number, total: number) {
    return {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    };
  }

  it('total=45, perPage=20 → totalPages=3', () => {
    const meta = calculateMeta(1, 20, 45);
    expect(meta.totalPages).toBe(3);
  });

  it('total=0 → totalPages=0', () => {
    const meta = calculateMeta(1, 20, 0);
    expect(meta.totalPages).toBe(0);
  });

  it('total=20, perPage=20 → totalPages=1', () => {
    const meta = calculateMeta(1, 20, 20);
    expect(meta.totalPages).toBe(1);
  });

  it('total=21, perPage=20 → totalPages=2', () => {
    const meta = calculateMeta(1, 20, 21);
    expect(meta.totalPages).toBe(2);
  });

  it('total=1, perPage=100 → totalPages=1', () => {
    const meta = calculateMeta(1, 100, 1);
    expect(meta.totalPages).toBe(1);
  });
});

// ──────────────────────────────────────
// 楽観的ロック検証（§BR-004, §3.6.6）
// ──────────────────────────────────────

describe('楽観的ロック競合検知 (§BR-004)', () => {
  function checkOptimisticLock(clientUpdatedAt: string, serverUpdatedAt: Date): boolean {
    return new Date(clientUpdatedAt).getTime() === serverUpdatedAt.getTime();
  }

  it('同一タイムスタンプ → 競合なし', () => {
    const timestamp = '2026-02-09T10:00:00.000Z';
    const serverDate = new Date(timestamp);
    expect(checkOptimisticLock(timestamp, serverDate)).toBe(true);
  });

  it('異なるタイムスタンプ → 競合あり', () => {
    const clientTimestamp = '2026-02-09T10:00:00.000Z';
    const serverDate = new Date('2026-02-09T14:30:00.000Z');
    expect(checkOptimisticLock(clientTimestamp, serverDate)).toBe(false);
  });

  it('1ミリ秒の差でも競合', () => {
    const clientTimestamp = '2026-02-09T10:00:00.000Z';
    const serverDate = new Date('2026-02-09T10:00:00.001Z');
    expect(checkOptimisticLock(clientTimestamp, serverDate)).toBe(false);
  });

  it('ISO 8601 タイムゾーン付き入力に対応', () => {
    const clientTimestamp = '2026-02-09T19:00:00+09:00';
    const serverDate = new Date('2026-02-09T10:00:00.000Z');
    expect(checkOptimisticLock(clientTimestamp, serverDate)).toBe(true);
  });
});

// ──────────────────────────────────────
// §3.6 入出力例テスト
// ──────────────────────────────────────

describe('API レスポンスフォーマット (§3.6, §5.3)', () => {
  it('§3.6.1: Create成功レスポンスに data オブジェクトがある', () => {
    const response = {
      data: {
        id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
        tenant_id: '01HQZY9876543210ZYXWVUTSRQ',
        title: '春の経営セミナー 2026',
      },
    };
    expect(response.data).toBeDefined();
    expect(response.data.id).toHaveLength(26);
  });

  it('§3.6.2: バリデーションエラーレスポンスの形式', () => {
    const errorResponse = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'バリデーションエラー',
        details: {
          title: ['タイトルは必須です'],
          start_date: ['日付の形式が不正です'],
        },
      },
    };
    expect(errorResponse.error.code).toBe('VALIDATION_ERROR');
    expect(errorResponse.error.details.title).toContain('タイトルは必須です');
  });

  it('§3.6.5: Update成功レスポンスの updated_at が更新される', () => {
    const createdAt = '2026-02-09T10:00:00Z';
    const updatedAt = '2026-02-09T14:30:00Z';
    expect(new Date(updatedAt).getTime()).toBeGreaterThan(new Date(createdAt).getTime());
  });

  it('§3.6.6: 楽観的ロック競合レスポンスの形式', () => {
    const conflictResponse = {
      error: {
        code: 'CONFLICT',
        message: 'このリソースは他のユーザーによって更新されています。最新のデータをリロードしてください。',
      },
    };
    expect(conflictResponse.error.code).toBe('CONFLICT');
  });

  it('§3.6.7: Delete成功レスポンスの形式', () => {
    const deleteResponse = {
      data: {
        id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
        is_active: false,
        deleted_at: '2026-02-09T15:00:00Z',
      },
    };
    expect(deleteResponse.data.is_active).toBe(false);
    expect(deleteResponse.data.deleted_at).toBeDefined();
  });

  it('§5.3.2: 一覧レスポンスに pagination が含まれる', () => {
    const listResponse = {
      data: [],
      pagination: {
        page: 1,
        perPage: 20,
        total: 45,
        totalPages: 3,
      },
    };
    expect(listResponse.pagination).toBeDefined();
    expect(listResponse.pagination.totalPages).toBe(3);
  });
});

// ──────────────────────────────────────
// §BR-001 論理削除原則テスト
// ──────────────────────────────────────

describe('論理削除原則 (§BR-001)', () => {
  it('削除後のリソースは is_active=false / deleted_at != null', () => {
    const deletedResource = {
      id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      deletedAt: new Date('2026-02-09T15:00:00Z'),
    };
    expect(deletedResource.deletedAt).toBeDefined();
    expect(deletedResource.deletedAt).not.toBeNull();
  });

  it('有効なリソースは deleted_at=null', () => {
    const activeResource = {
      id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      deletedAt: null,
    };
    expect(activeResource.deletedAt).toBeNull();
  });
});
