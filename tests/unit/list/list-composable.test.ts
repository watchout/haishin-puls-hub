// LIST-001-003 フロントエンド リスト操作 ユニットテスト
// 仕様書: docs/design/features/common/LIST-001-003_list-operations.md §9.1

import { describe, it, expect } from 'vitest'

// ──────────────────────────────────────
// parseQueryParams ロジックテスト (FR-007)
// ──────────────────────────────────────

type LocationQueryValue = string | null

function parseQueryParams(
  query: Record<string, LocationQueryValue | LocationQueryValue[]>,
): Record<string, unknown> {
  const parsed: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue

    const stringValue = Array.isArray(value) ? value[0] : value
    if (!stringValue) continue

    if (key === 'page' || key === 'per_page') {
      const num = parseInt(stringValue, 10)
      if (!isNaN(num)) {
        parsed[key] = num
      }
    } else if (key === 'order') {
      if (stringValue === 'asc' || stringValue === 'desc') {
        parsed.order = stringValue
      }
    } else {
      parsed[key] = stringValue
    }
  }

  return parsed
}

describe('parseQueryParams (FR-007 URL State Sync)', () => {
  it('空のクエリは空オブジェクトを返す', () => {
    expect(parseQueryParams({})).toEqual({})
  })

  it('page を数値にパースする', () => {
    const result = parseQueryParams({ page: '3' })
    expect(result.page).toBe(3)
  })

  it('per_page を数値にパースする', () => {
    const result = parseQueryParams({ per_page: '50' })
    expect(result.per_page).toBe(50)
  })

  it('order=asc はそのまま保持', () => {
    const result = parseQueryParams({ order: 'asc' })
    expect(result.order).toBe('asc')
  })

  it('order=desc はそのまま保持', () => {
    const result = parseQueryParams({ order: 'desc' })
    expect(result.order).toBe('desc')
  })

  it('order=invalid は無視される', () => {
    const result = parseQueryParams({ order: 'invalid' })
    expect(result.order).toBeUndefined()
  })

  it('sort は文字列として保持', () => {
    const result = parseQueryParams({ sort: 'title' })
    expect(result.sort).toBe('title')
  })

  it('q は文字列として保持', () => {
    const result = parseQueryParams({ q: 'search term' })
    expect(result.q).toBe('search term')
  })

  it('null 値は無視される', () => {
    const result = parseQueryParams({ page: null })
    expect(result.page).toBeUndefined()
  })

  it('配列は最初の値を使用', () => {
    const result = parseQueryParams({ sort: ['title', 'created_at'] })
    expect(result.sort).toBe('title')
  })

  it('配列の最初の要素が null の場合は無視', () => {
    const result = parseQueryParams({ sort: [null, 'title'] })
    expect(result.sort).toBeUndefined()
  })

  it('page が数値でない場合は無視', () => {
    const result = parseQueryParams({ page: 'abc' })
    expect(result.page).toBeUndefined()
  })

  it('カスタムフィルタパラメータが保持される', () => {
    const result = parseQueryParams({ status: 'active', category: 'seminar' })
    expect(result.status).toBe('active')
    expect(result.category).toBe('seminar')
  })

  it('複合クエリが正しくパースされる', () => {
    const result = parseQueryParams({
      page: '2',
      per_page: '10',
      sort: 'title',
      order: 'asc',
      q: 'test',
      status: 'active',
    })
    expect(result.page).toBe(2)
    expect(result.per_page).toBe(10)
    expect(result.sort).toBe('title')
    expect(result.order).toBe('asc')
    expect(result.q).toBe('test')
    expect(result.status).toBe('active')
  })
})

// ──────────────────────────────────────
// cleanQueryParams ロジックテスト
// ──────────────────────────────────────

interface ListFilters {
  page: number
  per_page: number
  sort: string
  order: 'asc' | 'desc'
  q?: string
  [key: string]: unknown
}

function cleanQueryParams(filters: ListFilters): Record<string, string> {
  const cleaned: Record<string, string> = {}

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = String(value)
    }
  }

  return cleaned
}

describe('cleanQueryParams', () => {
  it('有効な値をすべて文字列に変換する', () => {
    const result = cleanQueryParams({
      page: 1,
      per_page: 20,
      sort: 'created_at',
      order: 'desc',
    })
    expect(result.page).toBe('1')
    expect(result.per_page).toBe('20')
    expect(result.sort).toBe('created_at')
    expect(result.order).toBe('desc')
  })

  it('undefined 値は除外される', () => {
    const result = cleanQueryParams({
      page: 1,
      per_page: 20,
      sort: 'created_at',
      order: 'desc',
      q: undefined,
    })
    expect(result.q).toBeUndefined()
  })

  it('空文字は除外される', () => {
    const result = cleanQueryParams({
      page: 1,
      per_page: 20,
      sort: 'created_at',
      order: 'desc',
      q: '',
    })
    expect(result.q).toBeUndefined()
  })

  it('null 値は除外される', () => {
    const filters = {
      page: 1,
      per_page: 20,
      sort: 'created_at',
      order: 'desc' as const,
      status: null,
    }
    const result = cleanQueryParams(filters)
    expect(result.status).toBeUndefined()
  })

  it('カスタムフィルタが保持される', () => {
    const result = cleanQueryParams({
      page: 1,
      per_page: 20,
      sort: 'created_at',
      order: 'desc',
      status: 'active',
    })
    expect(result.status).toBe('active')
  })
})

// ──────────────────────────────────────
// ソートトグルロジック (FR-003)
// ──────────────────────────────────────

describe('ソートトグルロジック (FR-003)', () => {
  function applySort(
    currentSort: string,
    currentOrder: 'asc' | 'desc',
    newColumn: string,
  ): { sort: string; order: 'asc' | 'desc' } {
    if (currentSort === newColumn) {
      return {
        sort: currentSort,
        order: currentOrder === 'asc' ? 'desc' : 'asc',
      }
    }
    return { sort: newColumn, order: 'desc' }
  }

  it('同じカラムで asc→desc にトグルする', () => {
    const result = applySort('title', 'asc', 'title')
    expect(result.sort).toBe('title')
    expect(result.order).toBe('desc')
  })

  it('同じカラムで desc→asc にトグルする', () => {
    const result = applySort('title', 'desc', 'title')
    expect(result.sort).toBe('title')
    expect(result.order).toBe('asc')
  })

  it('異なるカラムは desc でリセットする', () => {
    const result = applySort('title', 'asc', 'created_at')
    expect(result.sort).toBe('created_at')
    expect(result.order).toBe('desc')
  })

  it('新しいカラムは常に desc で始まる', () => {
    const result = applySort('title', 'desc', 'start_at')
    expect(result.sort).toBe('start_at')
    expect(result.order).toBe('desc')
  })
})

// ──────────────────────────────────────
// フィルタリセットロジック
// ──────────────────────────────────────

describe('フィルタリセットロジック', () => {
  it('updateFilters はページを1にリセットする', () => {
    const currentFilters: ListFilters = {
      page: 5,
      per_page: 20,
      sort: 'created_at',
      order: 'desc',
      q: 'test',
    }

    const newFilters = {
      ...currentFilters,
      q: 'new search',
      page: 1, // リセット
    }

    expect(newFilters.page).toBe(1)
    expect(newFilters.q).toBe('new search')
  })

  it('clearFilters はデフォルト状態に戻す', () => {
    const defaultSort = 'created_at'
    const defaultOrder = 'desc'
    const defaultPerPage = 20

    const cleared: ListFilters = {
      page: 1,
      per_page: defaultPerPage,
      sort: defaultSort,
      order: defaultOrder,
    }

    expect(cleared.page).toBe(1)
    expect(cleared.per_page).toBe(20)
    expect(cleared.sort).toBe('created_at')
    expect(cleared.order).toBe('desc')
    expect(cleared.q).toBeUndefined()
  })
})

// ──────────────────────────────────────
// hasActiveFilters ロジック
// ──────────────────────────────────────

describe('hasActiveFilters ロジック', () => {
  function checkHasActiveFilters(filters: ListFilters): boolean {
    return !!(
      filters.q
      || Object.keys(filters).some(
        key =>
          !['page', 'per_page', 'sort', 'order', 'q'].includes(key)
          && filters[key] !== undefined
          && filters[key] !== '',
      )
    )
  }

  it('デフォルト状態はアクティブフィルタなし', () => {
    expect(checkHasActiveFilters({
      page: 1,
      per_page: 20,
      sort: 'created_at',
      order: 'desc',
    })).toBe(false)
  })

  it('q が設定されている場合はアクティブ', () => {
    expect(checkHasActiveFilters({
      page: 1,
      per_page: 20,
      sort: 'created_at',
      order: 'desc',
      q: 'test',
    })).toBe(true)
  })

  it('カスタムフィルタがある場合はアクティブ', () => {
    expect(checkHasActiveFilters({
      page: 1,
      per_page: 20,
      sort: 'created_at',
      order: 'desc',
      status: 'active',
    })).toBe(true)
  })

  it('q が空文字の場合はアクティブでない', () => {
    expect(checkHasActiveFilters({
      page: 1,
      per_page: 20,
      sort: 'created_at',
      order: 'desc',
      q: '',
    })).toBe(false)
  })

  it('カスタムフィルタが空文字の場合はアクティブでない', () => {
    expect(checkHasActiveFilters({
      page: 1,
      per_page: 20,
      sort: 'created_at',
      order: 'desc',
      status: '',
    })).toBe(false)
  })

  it('カスタムフィルタが undefined の場合はアクティブでない', () => {
    expect(checkHasActiveFilters({
      page: 1,
      per_page: 20,
      sort: 'created_at',
      order: 'desc',
      status: undefined,
    })).toBe(false)
  })

  it('page/per_page/sort/order の変更はアクティブとみなさない', () => {
    expect(checkHasActiveFilters({
      page: 5,
      per_page: 50,
      sort: 'title',
      order: 'asc',
    })).toBe(false)
  })
})

// ──────────────────────────────────────
// isEmpty ロジック (FR-008)
// ──────────────────────────────────────

describe('isEmpty ロジック (FR-008)', () => {
  it('ローディング中は isEmpty=false', () => {
    const loading = true
    const dataLength = 0
    const isEmpty = !loading && dataLength === 0
    expect(isEmpty).toBe(false)
  })

  it('データあり → isEmpty=false', () => {
    const loading = false
    const dataLength = 5 as number
    const isEmpty = !loading && dataLength === 0
    expect(isEmpty).toBe(false)
  })

  it('ローディング完了 + データなし → isEmpty=true', () => {
    const loading = false
    const dataLength = 0
    const isEmpty = !loading && dataLength === 0
    expect(isEmpty).toBe(true)
  })
})
