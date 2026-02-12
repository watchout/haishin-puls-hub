// CRUD-001-004 サーバー側汎用CRUDハンドラー
// 仕様書: docs/design/features/common/CRUD-001-004_crud-operations.md §8.2
//
// 各リソースの API エンドポイントはこのヘルパーを使って定型処理を行う。
// 具体例:
//   const { list, get } = createCrudHandlers({ table: event, ... })
//   export default list; // server/api/v1/events/index.get.ts

import { eq, and, sql, isNull } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import type { z } from 'zod'
import { ulid } from 'ulid'
import { db } from './db'
import { requirePermission } from './permission'
import { handleApiError } from './api-error'
import type { Action, Resource } from './permission-matrix'

// ──────────────────────────────────────
// 型定義
// ──────────────────────────────────────

interface CrudTableColumns {
  id: unknown
  tenantId: unknown
  createdAt: unknown
  updatedAt: unknown
  // 論理削除カラム（オプション）
  deletedAt?: unknown
  deletedBy?: unknown
  createdBy?: unknown
}

interface CrudOptions<TCreate, TUpdate> {
  /** Drizzle テーブル定義 */
  table: PgTable & CrudTableColumns
  /** リソース名（日本語: エラーメッセージ用） */
  resourceName: string
  /** 権限チェック用のリソースキー */
  permissionResource: Resource
  /** 作成用 Zod スキーマ（任意） */
  createSchema?: z.ZodSchema<TCreate>
  /** 更新用 Zod スキーマ（任意） */
  updateSchema?: z.ZodSchema<TUpdate>
  /** 論理削除をサポートするか（デフォルト: false） */
  softDelete?: boolean
}

// ──────────────────────────────────────
// ページネーション型 (§5.3.2)
// ──────────────────────────────────────

export interface PaginationMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

// ──────────────────────────────────────
// ファクトリー関数
// ──────────────────────────────────────

/**
 * 汎用 CRUD ハンドラーを生成する
 *
 * BR-001: 論理削除原則
 * BR-002: 権限チェック（RBAC）
 * BR-003: テナント分離
 * BR-004: 楽観的ロック
 */
export function createCrudHandlers<
  TCreate extends Record<string, unknown> = Record<string, unknown>,
  TUpdate extends Record<string, unknown> = Record<string, unknown>,
>(options: CrudOptions<TCreate, TUpdate>) {
  const {
    table,
    resourceName,
    permissionResource,
    createSchema,
    updateSchema,
    softDelete = false,
  } = options

  // テーブルカラム参照用（型アサーション）
  const t = table as unknown as Record<string, unknown>

  // テナント分離 + 論理削除考慮の共通 WHERE 条件
  function tenantFilter(tenantId: string) {
    const base = eq(t.tenantId as never, tenantId as never)
    if (softDelete && t.deletedAt) {
      return and(base, isNull(t.deletedAt as never))
    }
    return base
  }

  // ──────────────────────────────────────
  // 一覧取得 (GET /api/v1/{resource})
  // ──────────────────────────────────────
  const list = defineEventHandler(async (event) => {
    try {
      const ctx = await requirePermission(event, 'read' as Action, permissionResource)
      const query = getQuery(event)
      const page = Math.max(1, Number(query.page) || 1)
      const perPage = Math.min(100, Math.max(1, Number(query.per_page) || 20))
      const offset = (page - 1) * perPage

      const [data, countResult] = await Promise.all([
        db.select()
          .from(table)
          .where(tenantFilter(ctx.tenantId))
          .limit(perPage)
          .offset(offset),
        db.select({ count: sql<number>`count(*)::int` })
          .from(table)
          .where(tenantFilter(ctx.tenantId)),
      ])

      const total = countResult[0]?.count ?? 0

      return {
        data,
        pagination: {
          page,
          perPage,
          total,
          totalPages: Math.ceil(total / perPage),
        } satisfies PaginationMeta,
      }
    } catch (err) {
      handleApiError(err)
    }
  })

  // ──────────────────────────────────────
  // 詳細取得 (GET /api/v1/{resource}/{id})
  // ──────────────────────────────────────
  const get = defineEventHandler(async (event) => {
    try {
      const ctx = await requirePermission(event, 'read' as Action, permissionResource)
      const id = getRouterParam(event, 'id')

      if (!id) {
        throw createError({
          statusCode: 400,
          statusMessage: 'VALIDATION_ERROR',
          message: 'IDが指定されていません',
        })
      }

      const result = await db.select()
        .from(table)
        .where(and(
          eq(t.id as never, id as never),
          tenantFilter(ctx.tenantId),
        ))
        .limit(1)

      if (result.length === 0) {
        throw createError({
          statusCode: 404,
          statusMessage: 'NOT_FOUND',
          message: `${resourceName}が見つかりません`,
        })
      }

      return { data: result[0] }
    } catch (err) {
      handleApiError(err)
    }
  })

  // ──────────────────────────────────────
  // 新規作成 (POST /api/v1/{resource})
  // ──────────────────────────────────────
  const create = defineEventHandler(async (event) => {
    try {
      const ctx = await requirePermission(event, 'create' as Action, permissionResource)
      const body = await readBody(event)

      // Zod バリデーション
      if (createSchema) {
        const parsed = createSchema.safeParse(body)
        if (!parsed.success) {
          throw createError({
            statusCode: 400,
            statusMessage: 'VALIDATION_ERROR',
            message: 'バリデーションエラー',
            data: {
              code: 'VALIDATION_ERROR',
              details: parsed.error.flatten().fieldErrors,
            },
          })
        }
      }

      const result = await db.insert(table)
        .values({
          ...body,
          id: ulid(),
          tenantId: ctx.tenantId,
          createdBy: ctx.userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as never)
        .returning()

      setResponseStatus(event, 201)
      return { data: result[0] }
    } catch (err) {
      handleApiError(err)
    }
  })

  // ──────────────────────────────────────
  // 更新 (PATCH /api/v1/{resource}/{id})
  // ──────────────────────────────────────
  const update = defineEventHandler(async (event) => {
    try {
      const ctx = await requirePermission(event, 'update' as Action, permissionResource)
      const id = getRouterParam(event, 'id')

      if (!id) {
        throw createError({
          statusCode: 400,
          statusMessage: 'VALIDATION_ERROR',
          message: 'IDが指定されていません',
        })
      }

      const body = await readBody(event)

      // Zod バリデーション
      if (updateSchema) {
        const parsed = updateSchema.safeParse(body)
        if (!parsed.success) {
          throw createError({
            statusCode: 400,
            statusMessage: 'VALIDATION_ERROR',
            message: 'バリデーションエラー',
            data: {
              code: 'VALIDATION_ERROR',
              details: parsed.error.flatten().fieldErrors,
            },
          })
        }
      }

      // 既存データ取得
      const existing = await db.select()
        .from(table)
        .where(and(
          eq(t.id as never, id as never),
          tenantFilter(ctx.tenantId),
        ))
        .limit(1)

      if (existing.length === 0) {
        throw createError({
          statusCode: 404,
          statusMessage: 'NOT_FOUND',
          message: `${resourceName}が見つかりません`,
        })
      }

      // BR-004: 楽観的ロック
      const record = existing[0] as Record<string, unknown>
      if (body.updated_at && record.updatedAt) {
        const clientTime = new Date(body.updated_at as string).getTime()
        const serverTime = (record.updatedAt as Date).getTime()
        if (clientTime !== serverTime) {
          throw createError({
            statusCode: 409,
            statusMessage: 'CONFLICT',
            message: 'このリソースは他のユーザーによって更新されています。最新のデータをリロードしてください。',
            data: {
              code: 'CONFLICT',
              details: { server_updated_at: (record.updatedAt as Date).toISOString() },
            },
          })
        }
      }

      // updated_at はサーバー側で上書き
      const { updated_at: _removed, ...updatePayload } = body as Record<string, unknown>

      const result = await db.update(table)
        .set({
          ...updatePayload,
          updatedAt: new Date(),
        } as never)
        .where(eq(t.id as never, id as never))
        .returning()

      return { data: result[0] }
    } catch (err) {
      handleApiError(err)
    }
  })

  // ──────────────────────────────────────
  // 論理削除 (DELETE /api/v1/{resource}/{id})
  // ──────────────────────────────────────
  const remove = defineEventHandler(async (event) => {
    try {
      const ctx = await requirePermission(event, 'delete' as Action, permissionResource)
      const id = getRouterParam(event, 'id')

      if (!id) {
        throw createError({
          statusCode: 400,
          statusMessage: 'VALIDATION_ERROR',
          message: 'IDが指定されていません',
        })
      }

      // 存在確認
      const existing = await db.select()
        .from(table)
        .where(and(
          eq(t.id as never, id as never),
          tenantFilter(ctx.tenantId),
        ))
        .limit(1)

      if (existing.length === 0) {
        throw createError({
          statusCode: 404,
          statusMessage: 'NOT_FOUND',
          message: `${resourceName}が見つかりません`,
        })
      }

      if (softDelete) {
        // BR-001: 論理削除（推奨パターンB: deleted_at）
        const result = await db.update(table)
          .set({
            deletedAt: new Date(),
            deletedBy: ctx.userId,
          } as never)
          .where(eq(t.id as never, id as never))
          .returning()

        return { data: result[0] }
      } else {
        // softDelete が無効の場合は物理削除（スキーマに deleted_at がないテーブル用）
        const result = await db.delete(table)
          .where(eq(t.id as never, id as never))
          .returning()

        return { data: result[0] }
      }
    } catch (err) {
      handleApiError(err)
    }
  })

  // ──────────────────────────────────────
  // 復元 (POST /api/v1/{resource}/{id}/restore)
  // ──────────────────────────────────────
  const restore = defineEventHandler(async (event) => {
    try {
      if (!softDelete) {
        throw createError({
          statusCode: 400,
          statusMessage: 'BAD_REQUEST',
          message: 'このリソースは復元をサポートしていません',
        })
      }

      const ctx = await requirePermission(event, 'update' as Action, permissionResource)
      const id = getRouterParam(event, 'id')

      if (!id) {
        throw createError({
          statusCode: 400,
          statusMessage: 'VALIDATION_ERROR',
          message: 'IDが指定されていません',
        })
      }

      const result = await db.update(table)
        .set({
          deletedAt: null,
          deletedBy: null,
        } as never)
        .where(and(
          eq(t.id as never, id as never),
          eq(t.tenantId as never, ctx.tenantId as never),
        ))
        .returning()

      if (result.length === 0) {
        throw createError({
          statusCode: 404,
          statusMessage: 'NOT_FOUND',
          message: `${resourceName}が見つかりません`,
        })
      }

      return { data: result[0] }
    } catch (err) {
      handleApiError(err)
    }
  })

  return { list, get, create, update, remove, restore }
}
