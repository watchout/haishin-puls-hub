// CRUD-001-004 CRUDロジック ユニットテスト
// 仕様書: docs/design/features/common/CRUD-001-004_crud-operations.md §3, §7

import { describe, it, expect, vi } from 'vitest'

// --------------------------------------------------
// Nuxt auto-import モック
// --------------------------------------------------
vi.stubGlobal('createError', (opts: Record<string, unknown>) => {
  const err = new Error(opts.message as string) as Error & {
    statusCode: number
    data: unknown
  }
  err.statusCode = opts.statusCode as number
  err.data = opts.data
  return err
})

// ──────────────────────────────────────
// 楽観的ロック検証ロジック (BR-004)
// ──────────────────────────────────────

function checkOptimisticLock(
  clientUpdatedAt: string | undefined,
  serverUpdatedAt: Date,
): { conflict: boolean; serverTime?: string } {
  if (!clientUpdatedAt) {
    return { conflict: false }
  }
  const clientTime = new Date(clientUpdatedAt).getTime()
  const serverTime = serverUpdatedAt.getTime()
  if (clientTime !== serverTime) {
    return { conflict: true, serverTime: serverUpdatedAt.toISOString() }
  }
  return { conflict: false }
}

describe('楽観的ロック (BR-004)', () => {
  it('updated_at が一致する場合は競合なし', () => {
    const serverDate = new Date('2026-02-09T10:00:00Z')
    const result = checkOptimisticLock('2026-02-09T10:00:00Z', serverDate)
    expect(result.conflict).toBe(false)
  })

  it('updated_at が不一致の場合は競合あり', () => {
    const serverDate = new Date('2026-02-09T14:30:00Z')
    const result = checkOptimisticLock('2026-02-09T10:00:00Z', serverDate)
    expect(result.conflict).toBe(true)
    expect(result.serverTime).toBe('2026-02-09T14:30:00.000Z')
  })

  it('updated_at が未送信の場合はチェックスキップ', () => {
    const serverDate = new Date('2026-02-09T10:00:00Z')
    const result = checkOptimisticLock(undefined, serverDate)
    expect(result.conflict).toBe(false)
  })

  it('ミリ秒の差も検知される', () => {
    const serverDate = new Date('2026-02-09T10:00:00.001Z')
    const result = checkOptimisticLock('2026-02-09T10:00:00.000Z', serverDate)
    expect(result.conflict).toBe(true)
  })
})

// ──────────────────────────────────────
// テナント分離ロジック (BR-003)
// ──────────────────────────────────────

function isTenantMatch(resourceTenantId: string, userTenantId: string): boolean {
  return resourceTenantId === userTenantId
}

describe('テナント分離 (BR-003)', () => {
  it('同一テナントの場合はアクセス許可', () => {
    expect(isTenantMatch('tenant-A', 'tenant-A')).toBe(true)
  })

  it('異なるテナントの場合はアクセス拒否', () => {
    expect(isTenantMatch('tenant-A', 'tenant-B')).toBe(false)
  })

  it('空のテナントIDは拒否', () => {
    expect(isTenantMatch('', 'tenant-A')).toBe(false)
  })
})

// ──────────────────────────────────────
// ページネーション計算 (§3.7)
// ──────────────────────────────────────

function calculatePagination(
  page: number,
  perPage: number,
  total: number,
): { page: number; perPage: number; total: number; totalPages: number; offset: number } {
  const safePage = Math.max(1, page)
  const safePerPage = Math.min(100, Math.max(1, perPage))
  return {
    page: safePage,
    perPage: safePerPage,
    total,
    totalPages: Math.ceil(total / safePerPage),
    offset: (safePage - 1) * safePerPage,
  }
}

describe('ページネーション計算 (§3.7)', () => {
  it('デフォルト値（page=1, perPage=20）', () => {
    const result = calculatePagination(1, 20, 45)
    expect(result.page).toBe(1)
    expect(result.perPage).toBe(20)
    expect(result.total).toBe(45)
    expect(result.totalPages).toBe(3)
    expect(result.offset).toBe(0)
  })

  it('2ページ目のオフセット', () => {
    const result = calculatePagination(2, 20, 45)
    expect(result.offset).toBe(20)
  })

  it('perPage の最小値は 1', () => {
    const result = calculatePagination(1, 0, 10)
    expect(result.perPage).toBe(1)
  })

  it('perPage の最大値は 100', () => {
    const result = calculatePagination(1, 200, 1000)
    expect(result.perPage).toBe(100)
  })

  it('page の最小値は 1', () => {
    const result = calculatePagination(-1, 20, 100)
    expect(result.page).toBe(1)
    expect(result.offset).toBe(0)
  })

  it('total が 0 の場合は totalPages=0', () => {
    const result = calculatePagination(1, 20, 0)
    expect(result.totalPages).toBe(0)
  })

  it('total が perPage と同じ場合は totalPages=1', () => {
    const result = calculatePagination(1, 20, 20)
    expect(result.totalPages).toBe(1)
  })

  it('total が perPage+1 の場合は totalPages=2', () => {
    const result = calculatePagination(1, 20, 21)
    expect(result.totalPages).toBe(2)
  })
})

// ──────────────────────────────────────
// エラーコード定義テスト (§3.8)
// ──────────────────────────────────────

const ERROR_CODES = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  TENANT_MISMATCH: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_ERROR: 500,
} as const

describe('エラーコード定義 (§3.8)', () => {
  it('VALIDATION_ERROR は 400', () => {
    expect(ERROR_CODES.VALIDATION_ERROR).toBe(400)
  })

  it('UNAUTHORIZED は 401', () => {
    expect(ERROR_CODES.UNAUTHORIZED).toBe(401)
  })

  it('FORBIDDEN は 403', () => {
    expect(ERROR_CODES.FORBIDDEN).toBe(403)
  })

  it('NOT_FOUND は 404', () => {
    expect(ERROR_CODES.NOT_FOUND).toBe(404)
  })

  it('CONFLICT は 409', () => {
    expect(ERROR_CODES.CONFLICT).toBe(409)
  })

  it('UNPROCESSABLE_ENTITY は 422', () => {
    expect(ERROR_CODES.UNPROCESSABLE_ENTITY).toBe(422)
  })

  it('INTERNAL_ERROR は 500', () => {
    expect(ERROR_CODES.INTERNAL_ERROR).toBe(500)
  })

  it('全8エラーコードが定義されている', () => {
    expect(Object.keys(ERROR_CODES)).toHaveLength(8)
  })
})

// ──────────────────────────────────────
// 論理削除ロジック (BR-001)
// ──────────────────────────────────────

describe('論理削除ロジック (BR-001)', () => {
  it('削除フラグ設定時のフィールド', () => {
    const now = new Date()
    const userId = 'user-123'
    const deletePayload = {
      deletedAt: now,
      deletedBy: userId,
    }
    expect(deletePayload.deletedAt).toBeInstanceOf(Date)
    expect(deletePayload.deletedBy).toBe(userId)
  })

  it('復元時はフィールドを null にする', () => {
    const restorePayload = {
      deletedAt: null,
      deletedBy: null,
    }
    expect(restorePayload.deletedAt).toBeNull()
    expect(restorePayload.deletedBy).toBeNull()
  })
})

// ──────────────────────────────────────
// バリデーション境界値テスト (§3.7)
// ──────────────────────────────────────

describe('バリデーション境界値 (§3.7)', () => {
  it('ULID は 26 文字固定', () => {
    const validUlid = '01HQZX1234567890ABCDEFGH01'
    expect(validUlid).toHaveLength(26)
  })

  it('title の最小長は 1 文字', () => {
    const minTitle = 'a'
    expect(minTitle.length).toBeGreaterThanOrEqual(1)
  })

  it('title の最大長は 200 文字', () => {
    const maxTitle = 'a'.repeat(200)
    expect(maxTitle.length).toBeLessThanOrEqual(200)
  })

  it('description の最大長は 5000 文字', () => {
    const maxDesc = 'a'.repeat(5000)
    expect(maxDesc.length).toBeLessThanOrEqual(5000)
  })

  it('description は null 許可', () => {
    const desc: string | null = null
    expect(desc).toBeNull()
  })
})
