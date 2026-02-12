// CRUD-001-004 サーバー側エラーハンドリング
// 仕様書: docs/design/features/common/CRUD-001-004_crud-operations.md §9.2

import { createError } from 'h3'
import type { ZodError } from 'zod'

/**
 * API エラーを適切な HTTP エラーに変換する
 *
 * Zod バリデーションエラー、DB 制約違反、一般エラーを統一フォーマットで返す。
 *
 * レスポンスフォーマット (§3.8):
 * ```json
 * {
 *   "error": {
 *     "code": "ERROR_CODE",
 *     "message": "ユーザー向けメッセージ",
 *     "details": {}
 *   }
 * }
 * ```
 */
export function handleApiError(error: unknown): never {
  // Zod バリデーションエラー
  if (isZodError(error)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'VALIDATION_ERROR',
      message: 'バリデーションエラー',
      data: {
        code: 'VALIDATION_ERROR',
        details: error.flatten().fieldErrors,
      },
    })
  }

  // PostgreSQL エラーコード
  if (isPostgresError(error)) {
    // 23505: Unique制約違反
    if (error.code === '23505') {
      throw createError({
        statusCode: 409,
        statusMessage: 'CONFLICT',
        message: 'このリソースは既に存在します',
        data: { code: 'CONFLICT' },
      })
    }

    // 23503: 外部キー制約違反
    if (error.code === '23503') {
      throw createError({
        statusCode: 422,
        statusMessage: 'UNPROCESSABLE_ENTITY',
        message: '関連するリソースが存在しません',
        data: { code: 'UNPROCESSABLE_ENTITY' },
      })
    }
  }

  // H3 エラー（既に createError で作られたもの）はそのまま re-throw
  if (isH3Error(error)) {
    throw error
  }

  // デフォルト: 500 Internal Server Error
  throw createError({
    statusCode: 500,
    statusMessage: 'INTERNAL_ERROR',
    message: '内部サーバーエラー',
    data: { code: 'INTERNAL_ERROR' },
  })
}

// ──────────────────────────────────────
// 型ガード
// ──────────────────────────────────────

function isZodError(error: unknown): error is ZodError {
  return (
    error !== null
    && typeof error === 'object'
    && 'name' in error
    && (error as Record<string, unknown>).name === 'ZodError'
    && 'flatten' in error
    && typeof (error as Record<string, unknown>).flatten === 'function'
  )
}

interface PostgresError {
  code: string
  message: string
}

function isPostgresError(error: unknown): error is PostgresError {
  return (
    error !== null
    && typeof error === 'object'
    && 'code' in error
    && typeof (error as Record<string, unknown>).code === 'string'
  )
}

function isH3Error(error: unknown): error is Error & { statusCode: number } {
  return (
    error !== null
    && typeof error === 'object'
    && 'statusCode' in error
    && typeof (error as Record<string, unknown>).statusCode === 'number'
  )
}
