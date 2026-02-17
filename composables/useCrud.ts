// CRUD-001-004 汎用CRUDコンポーザブル
// 仕様書: docs/design/features/common/CRUD-001-004_crud-operations.md §8.1
//
// 全リソースに共通するCRUD操作を提供
// - 一覧取得（ページネーション付き）
// - 詳細取得
// - 新規作成（成功トースト + リダイレクト）
// - 更新（楽観的ロック対応）
// - 論理削除（確認ダイアログ + Undo対応）
// - 復元

import { TOAST_CONFIG } from '~/types/crud';
import type { PaginationMeta } from '~/types/crud';
import type { ApiError } from '~/composables/useErrorHandler';

// ──────────────────────────────────────
// 型定義
// ──────────────────────────────────────

export interface UseCrudOptions {
  /** APIリソースパス（例: 'events', 'venues'） */
  resource: string;
  /** 日本語リソース名（トースト用、例: 'イベント'） */
  resourceNameJa: string;
  /** 成功時のリダイレクト先（省略時はリダイレクトなし） */
  redirectOnSuccess?: string;
}

interface CrudListResult<T> {
  data: Ref<T[] | null>;
  pagination: Ref<PaginationMeta | null>;
  pending: Ref<boolean>;
  error: Ref<ApiError | null>;
  refresh: () => Promise<void>;
}

// ──────────────────────────────────────
// Composable
// ──────────────────────────────────────

export const useCrud = <T extends Record<string, unknown>>(
  options: UseCrudOptions,
) => {
  const { resource, resourceNameJa, redirectOnSuccess } = options;
  const toast = useToast();
  const router = useRouter();
  const { handleError } = useErrorHandler();
  const isSubmitting = ref(false);

  const baseUrl = `/api/v1/${resource}`;

  // ──── 一覧取得（FR-005, FR-006） ────

  const list = async (params?: Record<string, unknown>): Promise<CrudListResult<T>> => {
    const data = ref<T[] | null>(null) as Ref<T[] | null>;
    const pagination = ref<PaginationMeta | null>(null);
    const pending = ref(true);
    const error = ref<ApiError | null>(null);

    const fetchData = async () => {
      pending.value = true;
      try {
        const result = await $fetch<{ data: T[]; pagination: PaginationMeta }>(baseUrl, {
          query: params,
        });
        data.value = result.data;
        pagination.value = result.pagination;
        error.value = null;
      } catch (err) {
        error.value = err as ApiError;
        handleError(err as ApiError, `${resourceNameJa}の取得`);
      } finally {
        pending.value = false;
      }
    };

    await fetchData();

    return { data, pagination, pending, error, refresh: fetchData };
  };

  // ──── 詳細取得（FR-005, FR-006, FR-007） ────

  const get = async (id: string) => {
    const data = ref<T | null>(null) as Ref<T | null>;
    const pending = ref(true);
    const error = ref<ApiError | null>(null);

    try {
      const result = await $fetch<{ data: T }>(`${baseUrl}/${id}`);
      data.value = result.data;
    } catch (err) {
      error.value = err as ApiError;
      handleError(err as ApiError, `${resourceNameJa}の取得`);
    } finally {
      pending.value = false;
    }

    return { data, pending, error };
  };

  // ──── 新規作成（FR-001〜FR-004） ────

  const create = async (payload: Partial<T>) => {
    if (isSubmitting.value) return { data: null, error: null }; // 二重送信防止
    isSubmitting.value = true;

    try {
      const result = await $fetch<{ data: T }>(baseUrl, {
        method: 'POST',
        body: payload,
      });

      toast.add({
        title: `${resourceNameJa}を作成しました`,
        ...TOAST_CONFIG.success,
      });

      if (redirectOnSuccess) {
        await router.push(redirectOnSuccess);
      }

      return { data: result.data, error: null };
    } catch (err) {
      handleError(err as ApiError, `${resourceNameJa}の作成`);
      return { data: null, error: err as ApiError };
    } finally {
      isSubmitting.value = false;
    }
  };

  // ──── 更新（FR-009〜FR-013） ────

  const update = async (id: string, payload: Partial<T>) => {
    if (isSubmitting.value) return { data: null, error: null };
    isSubmitting.value = true;

    try {
      const result = await $fetch<{ data: T }>(`${baseUrl}/${id}`, {
        method: 'PATCH',
        body: payload,
      });

      toast.add({
        title: `${resourceNameJa}を更新しました`,
        ...TOAST_CONFIG.success,
      });

      return { data: result.data, error: null };
    } catch (err) {
      handleError(err as ApiError, `${resourceNameJa}の更新`);
      return { data: null, error: err as ApiError };
    } finally {
      isSubmitting.value = false;
    }
  };

  // ──── 論理削除（FR-014〜FR-018） ────

  const remove = async (id: string) => {
    if (isSubmitting.value) return { data: null, error: null };
    isSubmitting.value = true;

    try {
      const result = await $fetch<{ data: T }>(`${baseUrl}/${id}`, {
        method: 'DELETE',
      });

      toast.add({
        title: `${resourceNameJa}を削除しました`,
        color: TOAST_CONFIG.success.color,
        timeout: 5000,
        actions: [{
          label: '元に戻す',
          click: () => restore(id),
        }],
      });

      if (redirectOnSuccess) {
        await router.push(redirectOnSuccess);
      }

      return { data: result.data, error: null };
    } catch (err) {
      handleError(err as ApiError, `${resourceNameJa}の削除`);
      return { data: null, error: err as ApiError };
    } finally {
      isSubmitting.value = false;
    }
  };

  // ──── 復元（FR-016） ────

  const restore = async (id: string) => {
    try {
      await $fetch(`${baseUrl}/${id}/restore`, {
        method: 'POST',
      });

      toast.add({
        title: `${resourceNameJa}を復元しました`,
        ...TOAST_CONFIG.success,
      });
    } catch (err) {
      handleError(err as ApiError, `${resourceNameJa}の復元`);
    }
  };

  return {
    list,
    get,
    create,
    update,
    remove,
    restore,
    isSubmitting: readonly(isSubmitting),
  };
};
