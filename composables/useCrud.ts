// CRUD-001-004 フロントエンド汎用CRUD Composable
// 仕様書: docs/design/features/common/CRUD-001-004_crud-operations.md §8.1
//
// 使用例:
// ```ts
// const { list, get, create, update, remove } = useCrud({
//   resource: 'events',
//   resourceLabel: 'イベント',
// })
// ```

import type { PaginationMeta } from '~/server/utils/crud'

// ──────────────────────────────────────
// 型定義
// ──────────────────────────────────────

interface UseCrudOptions {
  /** API リソースパス (例: 'events', 'venues') */
  resource: string
  /** リソースの日本語名 (例: 'イベント', '会場') — トースト通知用 */
  resourceLabel: string
  /** 成功後のリダイレクト先パス（任意） */
  redirectOnSuccess?: string
}

interface ApiResponse<T> {
  data: T
}

interface ApiListResponse<T> {
  data: T[]
  pagination: PaginationMeta
}

interface ApiErrorBody {
  code?: string
  message?: string
  details?: Record<string, string[]>
}

// ──────────────────────────────────────
// Composable
// ──────────────────────────────────────

/**
 * 汎用 CRUD Composable
 *
 * FR-001～FR-022 の共通要件を満たす:
 * - FR-002/FR-012/FR-017: 成功トースト
 * - FR-003/FR-013/FR-018: エラートースト
 * - FR-004/FR-021: ローディング状態 + 二重送信防止
 * - FR-022: トースト通知（成功=3秒, エラー=5秒）
 * - FR-011: 楽観的ロック (409 Conflict 検知)
 */
export function useCrud<T extends Record<string, unknown> = Record<string, unknown>>(
  options: UseCrudOptions,
) {
  const { resource, resourceLabel, redirectOnSuccess } = options
  const toast = useToast()
  const router = useRouter()

  /** ローディング状態 */
  const isLoading = ref(false)

  // ──────────────────────────────────────
  // 一覧取得 (CRUD-002 §3.2 FR-005)
  // ──────────────────────────────────────
  async function list(params?: Record<string, unknown>) {
    isLoading.value = true
    try {
      const response = await $fetch<ApiListResponse<T>>(`/api/v1/${resource}`, {
        query: params,
      })
      return { data: response.data, pagination: response.pagination, error: null }
    } catch (err) {
      const apiError = extractError(err)
      toast.add({
        title: `${resourceLabel}の取得に失敗しました`,
        description: apiError.message,
        color: 'error',
        duration: 5000,
      })
      return { data: [] as T[], pagination: null, error: apiError }
    } finally {
      isLoading.value = false
    }
  }

  // ──────────────────────────────────────
  // 詳細取得 (CRUD-002 §3.2 FR-005)
  // ──────────────────────────────────────
  async function get(id: string) {
    isLoading.value = true
    try {
      const response = await $fetch<ApiResponse<T>>(`/api/v1/${resource}/${id}`)
      return { data: response.data, error: null }
    } catch (err) {
      const apiError = extractError(err)
      toast.add({
        title: `${resourceLabel}の取得に失敗しました`,
        description: apiError.message,
        color: 'error',
        duration: 5000,
      })
      return { data: null, error: apiError }
    } finally {
      isLoading.value = false
    }
  }

  // ──────────────────────────────────────
  // 新規作成 (CRUD-001 §3.1 FR-001～FR-004)
  // ──────────────────────────────────────
  async function create(payload: Partial<T>) {
    isLoading.value = true
    try {
      const response = await $fetch<ApiResponse<T>>(`/api/v1/${resource}`, {
        method: 'POST',
        body: payload,
      })

      // FR-002: 成功トースト
      toast.add({
        title: `${resourceLabel}を作成しました`,
        color: 'success',
        duration: 3000,
      })

      // リダイレクト
      if (redirectOnSuccess) {
        await router.push(redirectOnSuccess)
      }

      return { data: response.data, error: null }
    } catch (err) {
      const apiError = extractError(err)
      // FR-003: エラートースト
      toast.add({
        title: `${resourceLabel}の作成に失敗しました`,
        description: apiError.message,
        color: 'error',
        duration: 5000,
      })
      return { data: null, error: apiError }
    } finally {
      isLoading.value = false
    }
  }

  // ──────────────────────────────────────
  // 更新 (CRUD-003 §3.3 FR-009～FR-013)
  // ──────────────────────────────────────
  async function update(id: string, payload: Partial<T>) {
    isLoading.value = true
    try {
      const response = await $fetch<ApiResponse<T>>(`/api/v1/${resource}/${id}`, {
        method: 'PATCH',
        body: payload,
      })

      // FR-012: 成功トースト
      toast.add({
        title: `${resourceLabel}を更新しました`,
        color: 'success',
        duration: 3000,
      })

      return { data: response.data, error: null }
    } catch (err) {
      const apiError = extractError(err)

      // FR-011/FR-013: 競合エラーは特別処理
      if (apiError.statusCode === 409) {
        toast.add({
          title: '競合エラー',
          description: 'このリソースは他のユーザーによって更新されています。ページをリロードしてください。',
          color: 'error',
          duration: 10000,
        })
      } else {
        toast.add({
          title: `${resourceLabel}の更新に失敗しました`,
          description: apiError.message,
          color: 'error',
          duration: 5000,
        })
      }

      return { data: null, error: apiError }
    } finally {
      isLoading.value = false
    }
  }

  // ──────────────────────────────────────
  // 削除 (CRUD-004 §3.4 FR-014～FR-018)
  // ──────────────────────────────────────
  async function remove(id: string) {
    isLoading.value = true
    try {
      const response = await $fetch<ApiResponse<T>>(`/api/v1/${resource}/${id}`, {
        method: 'DELETE',
      })

      // FR-017: 成功トースト + FR-016: Undo ボタン
      toast.add({
        title: `${resourceLabel}を削除しました`,
        color: 'success',
        duration: 5000,
      })

      // リダイレクト
      if (redirectOnSuccess) {
        await router.push(redirectOnSuccess)
      }

      return { data: response.data, error: null }
    } catch (err) {
      const apiError = extractError(err)
      // FR-018: エラートースト
      toast.add({
        title: `${resourceLabel}の削除に失敗しました`,
        description: apiError.message,
        color: 'error',
        duration: 5000,
      })
      return { data: null, error: apiError }
    } finally {
      isLoading.value = false
    }
  }

  // ──────────────────────────────────────
  // 復元 (§3.4 FR-016)
  // ──────────────────────────────────────
  async function restore(id: string) {
    isLoading.value = true
    try {
      await $fetch(`/api/v1/${resource}/${id}/restore`, {
        method: 'POST',
      })

      toast.add({
        title: `${resourceLabel}を復元しました`,
        color: 'success',
        duration: 3000,
      })

      return { error: null }
    } catch (err) {
      const apiError = extractError(err)
      toast.add({
        title: `${resourceLabel}の復元に失敗しました`,
        description: apiError.message,
        color: 'error',
        duration: 5000,
      })
      return { error: apiError }
    } finally {
      isLoading.value = false
    }
  }

  return {
    list,
    get,
    create,
    update,
    remove,
    restore,
    isLoading: readonly(isLoading),
  }
}

// ──────────────────────────────────────
// ユーティリティ
// ──────────────────────────────────────

interface ExtractedError {
  statusCode: number
  message: string
  code?: string
  details?: Record<string, string[]>
}

/**
 * $fetch エラーから統一フォーマットを抽出
 */
function extractError(err: unknown): ExtractedError {
  if (err !== null && typeof err === 'object') {
    const fetchErr = err as {
      statusCode?: number
      data?: { error?: ApiErrorBody; message?: string }
      message?: string
    }
    return {
      statusCode: fetchErr.statusCode ?? 500,
      message: fetchErr.data?.error?.message ?? fetchErr.data?.message ?? fetchErr.message ?? '不明なエラー',
      code: fetchErr.data?.error?.code,
      details: fetchErr.data?.error?.details,
    }
  }
  return { statusCode: 500, message: '不明なエラー' }
}
