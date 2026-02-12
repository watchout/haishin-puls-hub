// LIST-001-003 フロントエンド リスト操作 Composable
// 仕様書: docs/design/features/common/LIST-001-003_list-operations.md §9.1
//
// URL State Sync 付きのリスト操作（ページネーション・ソート・フィルタ）を提供する。
//
// 使用例:
// ```ts
// const { data, pagination, loading, filters, updateFilters, changePage, changeSort, clearFilters }
//   = useList<Event>({
//     endpoint: '/api/v1/events',
//     defaultSort: 'start_at',
//     defaultOrder: 'desc',
//   })
// ```

import type { LocationQueryValue } from 'vue-router'

// ──────────────────────────────────────
// 型定義 (§5.2)
// ──────────────────────────────────────

export interface ListOptions {
  /** API エンドポイント (例: '/api/v1/events') */
  endpoint: string
  /** デフォルトのソートカラム (未指定時: 'created_at') */
  defaultSort?: string
  /** デフォルトのソート順 (未指定時: 'desc') */
  defaultOrder?: 'asc' | 'desc'
  /** デフォルトの件数/ページ (未指定時: 20) */
  defaultPerPage?: number
}

export interface ListFilters {
  page: number
  per_page: number
  sort: string
  order: 'asc' | 'desc'
  q?: string
  [key: string]: unknown
}

export interface ListPaginationMeta {
  total: number
  page: number
  per_page: number
  total_pages: number
}

// ──────────────────────────────────────
// Composable 本体
// ──────────────────────────────────────

/**
 * リスト操作 Composable
 *
 * FR-001: オフセットベースページネーション
 * FR-003: 単一カラムソート
 * FR-004-006: フィルタ (複数値, 範囲, フリーテキスト)
 * FR-007: URL State Sync
 * FR-008: 空結果表示
 * FR-009: ローディングスケルトン
 */
export function useList<T>(options: ListOptions) {
  const route = useRoute()
  const router = useRouter()

  const defaultSort = options.defaultSort || 'created_at'
  const defaultOrder = options.defaultOrder || 'desc'
  const defaultPerPage = options.defaultPerPage || 20

  // ──────────────────────────────────────
  // 状態
  // ──────────────────────────────────────

  /** フィルタ状態（URLと同期） */
  const filters = ref<ListFilters>({
    page: 1,
    per_page: defaultPerPage,
    sort: defaultSort,
    order: defaultOrder,
    ...parseQueryParams(route.query),
  }) as Ref<ListFilters>

  /** データ配列 */
  const data = ref<T[]>([]) as Ref<T[]>

  /** ページネーション情報 */
  const pagination = ref<ListPaginationMeta>({
    total: 0,
    page: 1,
    per_page: defaultPerPage,
    total_pages: 0,
  })

  /** ローディング状態 */
  const loading = ref(false)

  /** エラー状態 */
  const error = ref<Error | null>(null)

  /** 結果が 0 件か */
  const isEmpty = computed(() => !loading.value && data.value.length === 0)

  /** アクティブなフィルタがあるか */
  const hasActiveFilters = computed(() => {
    const f = filters.value
    return !!(
      f.q
      || Object.keys(f).some(
        key =>
          !['page', 'per_page', 'sort', 'order', 'q'].includes(key)
          && f[key] !== undefined
          && f[key] !== '',
      )
    )
  })

  // ──────────────────────────────────────
  // データ取得
  // ──────────────────────────────────────

  async function fetchData() {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch<{
        data: T[]
        pagination: ListPaginationMeta
      }>(options.endpoint, {
        query: cleanQueryParams(filters.value),
      })

      data.value = response.data
      pagination.value = response.pagination
    } catch (e) {
      error.value = e as Error
      data.value = []
      pagination.value = { total: 0, page: 1, per_page: defaultPerPage, total_pages: 0 }
    } finally {
      loading.value = false
    }
  }

  // ──────────────────────────────────────
  // フィルタ操作
  // ──────────────────────────────────────

  /**
   * フィルタを更新する
   * フィルタ変更時は page=1 にリセット (仕様: §9.1 updateFilters)
   */
  function updateFilters(newFilters: Partial<ListFilters>) {
    filters.value = {
      ...filters.value,
      ...newFilters,
      page: 1,
    }
    syncUrl()
    fetchData()
  }

  /**
   * ページを変更する
   */
  function changePage(page: number) {
    filters.value.page = page
    syncUrl()
    fetchData()
  }

  /**
   * ソートを変更する
   * 同じカラムをクリックした場合は asc/desc をトグル
   * 異なるカラムは desc でリセット
   */
  function changeSort(column: string) {
    if (filters.value.sort === column) {
      filters.value.order = filters.value.order === 'asc' ? 'desc' : 'asc'
    } else {
      filters.value.sort = column
      filters.value.order = 'desc'
    }
    filters.value.page = 1
    syncUrl()
    fetchData()
  }

  /**
   * 全フィルタをクリアしてデフォルト状態に戻す
   */
  function clearFilters() {
    filters.value = {
      page: 1,
      per_page: defaultPerPage,
      sort: defaultSort,
      order: defaultOrder,
    }
    syncUrl()
    fetchData()
  }

  // ──────────────────────────────────────
  // URL同期 (FR-007)
  // ──────────────────────────────────────

  function syncUrl() {
    const cleaned = cleanQueryParams(filters.value)
    router.push({ query: cleaned })
  }

  // ──────────────────────────────────────
  // ライフサイクル
  // ──────────────────────────────────────

  // 初回ロード
  onMounted(() => {
    fetchData()
  })

  // ブラウザバック/フォワードで URL が変わった時
  watch(
    () => route.query,
    (newQuery) => {
      const parsed = parseQueryParams(newQuery)
      const currentClean = cleanQueryParams(filters.value)
      const newClean = cleanQueryParams({
        ...filters.value,
        ...parsed,
      })

      // 実際に値が変わった場合のみ再フェッチ
      if (JSON.stringify(currentClean) !== JSON.stringify(newClean)) {
        filters.value = {
          page: 1,
          per_page: defaultPerPage,
          sort: defaultSort,
          order: defaultOrder,
          ...parsed,
        }
        fetchData()
      }
    },
  )

  return {
    data: readonly(data),
    pagination: readonly(pagination),
    loading: readonly(loading),
    error: readonly(error),
    isEmpty,
    hasActiveFilters,
    filters,
    updateFilters,
    changePage,
    changeSort,
    clearFilters,
    refresh: fetchData,
  }
}

// ──────────────────────────────────────
// ヘルパー関数
// ──────────────────────────────────────

/**
 * URLクエリパラメータを ListFilters にパース
 */
function parseQueryParams(
  query: Record<string, LocationQueryValue | LocationQueryValue[]>,
): Partial<ListFilters> {
  const parsed: Partial<ListFilters> = {}

  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue

    const stringValue = Array.isArray(value) ? value[0] : value
    if (!stringValue) continue

    // 数値型パラメータ
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

/**
 * フィルタを URL クエリパラメータ用にクリーン化
 * undefined / null / 空文字のパラメータを除外
 */
function cleanQueryParams(filters: ListFilters): Record<string, string> {
  const cleaned: Record<string, string> = {}

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = String(value)
    }
  }

  return cleaned
}
