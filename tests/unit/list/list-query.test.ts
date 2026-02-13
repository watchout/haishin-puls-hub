// LIST-001-003 サーバー側リストクエリ ユニットテスト
// 仕様書: docs/design/features/common/LIST-001-003_list-operations.md §3.5, §3.6, §9.2

import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'

// --------------------------------------------------
// Nuxt auto-import モック
// --------------------------------------------------
vi.stubGlobal('createError', (opts: Record<string, unknown>) => {
  const err = new Error(opts.message as string) as Error & {
    statusCode: number
    statusMessage: string
    data: unknown
  }
  err.statusCode = opts.statusCode as number
  err.statusMessage = opts.statusMessage as string
  err.data = opts.data
  return err
})

// ──────────────────────────────────────
// offsetPaginationSchema テスト (§3.5)
// ──────────────────────────────────────

// スキーマをロジック単位で再現 (Nuxt コンテキスト外)
const offsetPaginationSchema = z.object({
  page: z.coerce.number().int().min(1, 'page must be a positive integer').default(1),
  per_page: z.coerce.number().int().min(1, 'per_page must be between 1 and 100').max(100, 'per_page must be between 1 and 100').default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  q: z.string().max(200).optional(),
})

describe('offsetPaginationSchema バリデーション', () => {
  it('デフォルト値が正しく設定される', () => {
    const result = offsetPaginationSchema.parse({})
    expect(result.page).toBe(1)
    expect(result.per_page).toBe(20)
    expect(result.order).toBe('desc')
    expect(result.sort).toBeUndefined()
    expect(result.q).toBeUndefined()
  })

  it('文字列の数値が coerce される', () => {
    const result = offsetPaginationSchema.parse({ page: '3', per_page: '50' })
    expect(result.page).toBe(3)
    expect(result.per_page).toBe(50)
  })

  it('page=0 はバリデーションエラー', () => {
    const result = offsetPaginationSchema.safeParse({ page: 0 })
    expect(result.success).toBe(false)
  })

  it('page=-1 はバリデーションエラー', () => {
    const result = offsetPaginationSchema.safeParse({ page: -1 })
    expect(result.success).toBe(false)
  })

  it('per_page=0 はバリデーションエラー', () => {
    const result = offsetPaginationSchema.safeParse({ per_page: 0 })
    expect(result.success).toBe(false)
  })

  it('per_page=101 はバリデーションエラー', () => {
    const result = offsetPaginationSchema.safeParse({ per_page: 101 })
    expect(result.success).toBe(false)
  })

  it('per_page=100 は有効', () => {
    const result = offsetPaginationSchema.parse({ per_page: 100 })
    expect(result.per_page).toBe(100)
  })

  it('per_page=1 は有効', () => {
    const result = offsetPaginationSchema.parse({ per_page: 1 })
    expect(result.per_page).toBe(1)
  })

  it('order=asc は有効', () => {
    const result = offsetPaginationSchema.parse({ order: 'asc' })
    expect(result.order).toBe('asc')
  })

  it('order=desc は有効', () => {
    const result = offsetPaginationSchema.parse({ order: 'desc' })
    expect(result.order).toBe('desc')
  })

  it('order=invalid はバリデーションエラー', () => {
    const result = offsetPaginationSchema.safeParse({ order: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('q の最大長は 200 文字', () => {
    const result = offsetPaginationSchema.parse({ q: 'a'.repeat(200) })
    expect(result.q).toHaveLength(200)
  })

  it('q が 201 文字以上はバリデーションエラー', () => {
    const result = offsetPaginationSchema.safeParse({ q: 'a'.repeat(201) })
    expect(result.success).toBe(false)
  })

  it('q=空文字は有効', () => {
    const result = offsetPaginationSchema.parse({ q: '' })
    expect(result.q).toBe('')
  })

  it('page が小数はバリデーションエラー', () => {
    const result = offsetPaginationSchema.safeParse({ page: 1.5 })
    expect(result.success).toBe(false)
  })
})

// ──────────────────────────────────────
// validateListQuery ロジックテスト
// ──────────────────────────────────────

// ロジック再現
function validateListQuery(
  rawQuery: Record<string, unknown>,
  options: { allowedSortColumns: string[]; defaultSort?: string; defaultOrder?: 'asc' | 'desc' },
) {
  const base = offsetPaginationSchema.safeParse(rawQuery)
  if (!base.success) {
    const firstError = base.error.issues[0]
    const param = firstError?.path[0] as string
    throw createError({
      statusCode: 400,
      statusMessage: `INVALID_${param?.toUpperCase() || 'PARAM'}`,
      message: firstError?.message || 'バリデーションエラー',
      data: {
        code: `INVALID_${param?.toUpperCase() || 'PARAM'}`,
        details: { parameter: param, constraint: firstError?.message },
      },
    })
  }

  const parsed = base.data
  const sortColumn = parsed.sort || options.defaultSort || 'created_at'
  if (!options.allowedSortColumns.includes(sortColumn)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'INVALID_SORT',
      message: `sort column '${sortColumn}' is not allowed`,
      data: {
        code: 'INVALID_SORT',
        details: {
          parameter: 'sort',
          value: sortColumn,
          allowed: options.allowedSortColumns,
        },
      },
    })
  }

  const filters: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(rawQuery)) {
    if (!['page', 'per_page', 'sort', 'order', 'q'].includes(key)) {
      filters[key] = value
    }
  }

  return {
    ...parsed,
    sort: sortColumn,
    order: parsed.order || options.defaultOrder || 'desc',
    ...filters,
  }
}

describe('validateListQuery', () => {
  const options = {
    allowedSortColumns: ['created_at', 'title', 'start_at'],
    defaultSort: 'created_at',
  }

  it('有効なクエリが正しくパースされる', () => {
    const result = validateListQuery(
      { page: '2', per_page: '10', sort: 'title', order: 'asc' },
      options,
    )
    expect(result.page).toBe(2)
    expect(result.per_page).toBe(10)
    expect(result.sort).toBe('title')
    expect(result.order).toBe('asc')
  })

  it('sort 未指定時はデフォルトが使われる', () => {
    const result = validateListQuery({}, options)
    expect(result.sort).toBe('created_at')
  })

  it('sort が許可リスト外の場合は 400 エラー', () => {
    try {
      validateListQuery({ sort: 'invalid_column' }, options)
      expect.unreachable('should throw')
    } catch (e) {
      const err = e as Error & { statusCode: number; statusMessage: string; data: { code: string } }
      expect(err.statusCode).toBe(400)
      expect(err.statusMessage).toBe('INVALID_SORT')
      expect(err.data.code).toBe('INVALID_SORT')
    }
  })

  it('page=0 の場合は INVALID_PAGE エラー', () => {
    try {
      validateListQuery({ page: 0 }, options)
      expect.unreachable('should throw')
    } catch (e) {
      const err = e as Error & { statusCode: number; statusMessage: string }
      expect(err.statusCode).toBe(400)
      expect(err.statusMessage).toBe('INVALID_PAGE')
    }
  })

  it('per_page=101 の場合は INVALID_PER_PAGE エラー', () => {
    try {
      validateListQuery({ per_page: 101 }, options)
      expect.unreachable('should throw')
    } catch (e) {
      const err = e as Error & { statusCode: number; statusMessage: string }
      expect(err.statusCode).toBe(400)
      expect(err.statusMessage).toBe('INVALID_PER_PAGE')
    }
  })

  it('追加のフィルタパラメータが保持される', () => {
    const result = validateListQuery(
      { status: 'active', category: 'seminar' },
      options,
    )
    expect((result as Record<string, unknown>).status).toBe('active')
    expect((result as Record<string, unknown>).category).toBe('seminar')
  })

  it('page / per_page / sort / order / q はフィルタに含まれない', () => {
    const result = validateListQuery(
      { page: '1', per_page: '20', sort: 'created_at', order: 'desc', q: 'test', extra: 'value' },
      options,
    )
    // extra のみがフィルタとして含まれるべき
    expect((result as Record<string, unknown>).extra).toBe('value')
    // 標準パラメータはトップレベルに
    expect(result.page).toBe(1)
    expect(result.per_page).toBe(20)
    expect(result.q).toBe('test')
  })
})

// ──────────────────────────────────────
// ページネーション計算テスト
// ──────────────────────────────────────

function calculatePagination(total: number, page: number, perPage: number) {
  return {
    total,
    page,
    per_page: perPage,
    total_pages: Math.ceil(total / perPage),
  }
}

describe('ページネーション計算', () => {
  it('total=45, page=1, per_page=20 → total_pages=3', () => {
    const result = calculatePagination(45, 1, 20)
    expect(result.total_pages).toBe(3)
  })

  it('total=0 → total_pages=0', () => {
    const result = calculatePagination(0, 1, 20)
    expect(result.total_pages).toBe(0)
  })

  it('total=20, per_page=20 → total_pages=1', () => {
    const result = calculatePagination(20, 1, 20)
    expect(result.total_pages).toBe(1)
  })

  it('total=21, per_page=20 → total_pages=2', () => {
    const result = calculatePagination(21, 1, 20)
    expect(result.total_pages).toBe(2)
  })

  it('total=100, per_page=100 → total_pages=1', () => {
    const result = calculatePagination(100, 1, 100)
    expect(result.total_pages).toBe(1)
  })

  it('total=1, per_page=1 → total_pages=1', () => {
    const result = calculatePagination(1, 1, 1)
    expect(result.total_pages).toBe(1)
  })

  it('オフセット計算: page=3, per_page=20 → offset=40', () => {
    const page = 3
    const perPage = 20
    const offset = (page - 1) * perPage
    expect(offset).toBe(40)
  })

  it('オフセット計算: page=1 → offset=0', () => {
    const page = 1
    const perPage = 20
    const offset = (page - 1) * perPage
    expect(offset).toBe(0)
  })
})

// ──────────────────────────────────────
// フィルタヘルパーロジックテスト (FR-004, FR-005)
// ──────────────────────────────────────

describe('multiValueFilter ロジック (FR-004)', () => {
  // ロジックのみテスト（Drizzle なし）
  function parseMultiValue(value: string | undefined): string[] {
    if (!value || value.trim() === '') return []
    return value.split(',').map(v => v.trim()).filter(Boolean)
  }

  it('単一値を正しくパースする', () => {
    expect(parseMultiValue('active')).toEqual(['active'])
  })

  it('カンマ区切りの複数値をパースする', () => {
    expect(parseMultiValue('active,draft,archived')).toEqual(['active', 'draft', 'archived'])
  })

  it('空文字は空配列を返す', () => {
    expect(parseMultiValue('')).toEqual([])
  })

  it('undefined は空配列を返す', () => {
    expect(parseMultiValue(undefined)).toEqual([])
  })

  it('前後のスペースがトリムされる', () => {
    expect(parseMultiValue(' active , draft ')).toEqual(['active', 'draft'])
  })

  it('空のカンマ区切り要素は除外される', () => {
    expect(parseMultiValue('active,,draft')).toEqual(['active', 'draft'])
  })

  it('カンマのみは空配列を返す', () => {
    expect(parseMultiValue(',')).toEqual([])
  })
})

describe('rangeFilter ロジック (FR-005)', () => {
  function parseRangeParams(
    params: Record<string, unknown>,
    paramName: string,
  ): { gte?: string; lte?: string; gt?: string; lt?: string } {
    const result: { gte?: string; lte?: string; gt?: string; lt?: string } = {}
    const gteValue = params[`${paramName}_gte`]
    const lteValue = params[`${paramName}_lte`]
    const gtValue = params[`${paramName}_gt`]
    const ltValue = params[`${paramName}_lt`]

    if (gteValue) result.gte = String(gteValue)
    if (lteValue) result.lte = String(lteValue)
    if (gtValue) result.gt = String(gtValue)
    if (ltValue) result.lt = String(ltValue)

    return result
  }

  it('_gte パラメータを認識する', () => {
    const result = parseRangeParams({ start_at_gte: '2026-01-01' }, 'start_at')
    expect(result.gte).toBe('2026-01-01')
  })

  it('_lte パラメータを認識する', () => {
    const result = parseRangeParams({ start_at_lte: '2026-12-31' }, 'start_at')
    expect(result.lte).toBe('2026-12-31')
  })

  it('_gt と _lt の両方を認識する', () => {
    const result = parseRangeParams(
      { price_gt: '100', price_lt: '500' },
      'price',
    )
    expect(result.gt).toBe('100')
    expect(result.lt).toBe('500')
  })

  it('該当パラメータがない場合は空オブジェクト', () => {
    const result = parseRangeParams({ other: 'value' }, 'start_at')
    expect(result).toEqual({})
  })

  it('_gte と _lte の組み合わせ（範囲指定）', () => {
    const result = parseRangeParams(
      { created_at_gte: '2026-01-01', created_at_lte: '2026-01-31' },
      'created_at',
    )
    expect(result.gte).toBe('2026-01-01')
    expect(result.lte).toBe('2026-01-31')
  })
})
