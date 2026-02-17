// CRUD-001-004 共通CRUD型定義
// 仕様書: docs/design/features/common/CRUD-001-004_crud-operations.md §4, §5

import { z } from 'zod';

// ──────────────────────────────────────
// 共通レスポンス型
// ──────────────────────────────────────

/** 単一リソース成功レスポンス */
export interface SingleResponse<T> {
  data: T;
}

/** 一覧リソース成功レスポンス */
export interface ListResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/** ページネーション情報 */
export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

/** エラーレスポンス（§3.8） */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]> | Record<string, unknown>;
  };
}

// ──────────────────────────────────────
// エラーコード（§3.8）
// ──────────────────────────────────────

export const CRUD_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TENANT_MISMATCH: 'TENANT_MISMATCH',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type CrudErrorCode = typeof CRUD_ERROR_CODES[keyof typeof CRUD_ERROR_CODES];

/** エラーコード→HTTPステータスマッピング */
export const ERROR_STATUS_MAP: Record<CrudErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  TENANT_MISMATCH: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_ERROR: 500,
};

/** エラーコード→日本語メッセージ */
export const ERROR_MESSAGES: Record<CrudErrorCode, string> = {
  VALIDATION_ERROR: 'バリデーションエラー',
  UNAUTHORIZED: '認証が必要です',
  FORBIDDEN: 'この操作を実行する権限がありません',
  TENANT_MISMATCH: 'アクセスが拒否されました',
  NOT_FOUND: 'リソースが見つかりません',
  CONFLICT: 'このリソースは他のユーザーによって更新されています。最新のデータをリロードしてください。',
  UNPROCESSABLE_ENTITY: 'ビジネスルール違反',
  INTERNAL_ERROR: '内部サーバーエラー',
};

// ──────────────────────────────────────
// バリデーションスキーマ（§3.7）
// ──────────────────────────────────────

/** ページネーションクエリスキーマ */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

/** ULID パラメータスキーマ */
export const ulidParamSchema = z.string().length(26, 'IDは26文字の ULID 形式である必要があります');

/** 楽観的ロック用 updated_at スキーマ */
export const optimisticLockSchema = z.object({
  updatedAt: z.string().datetime('updated_at は ISO 8601 形式である必要があります'),
});

// ──────────────────────────────────────
// トースト設定（§3.5 FR-022）
// ──────────────────────────────────────

export const TOAST_CONFIG = {
  success: { color: 'green' as const, timeout: 3000 },
  error: { color: 'red' as const, timeout: 5000 },
  info: { color: 'blue' as const, timeout: 3000 },
} as const;
