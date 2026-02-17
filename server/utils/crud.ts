// CRUD-001-004 サーバー側共通CRUDハンドラー
// 仕様書: docs/design/features/common/CRUD-001-004_crud-operations.md §8.2
//
// 全リソースに共通するCRUD操作パターンを提供
// テナント分離、権限チェック、楽観的ロック、論理削除を統一実装

import { eq, and, count, type SQL } from 'drizzle-orm';
import type { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import { createError, getQuery, getRouterParam, readBody, type H3Event } from 'h3';
import { ulid } from 'ulid';
import type { z } from 'zod';
import { requirePermission } from './permission';
import type { Resource } from './permission-matrix';
import { db } from './db';

// ──────────────────────────────────────
// 型定義
// ──────────────────────────────────────

/** CRUDテーブルに共通するカラム定義 */
interface CrudTable {
  id: PgColumn;
  tenantId: PgColumn;
  createdBy: PgColumn;
  createdAt: PgColumn;
  updatedAt: PgColumn;
}

/** 論理削除対応テーブル（パターンB: deleted_at） */
interface SoftDeletableTable extends CrudTable {
  deletedAt: PgColumn;
}

/** 楽観的ロックに使うタイムスタンプ比較用の行 */
interface RowWithUpdatedAt {
  updatedAt: Date;
}

/** CRUD ハンドラー生成オプション */
export interface CrudHandlerOptions<TCreate, TUpdate> {
  table: PgTable & CrudTable;
  resource: Resource;
  resourceNameJa: string;
  createSchema?: z.ZodSchema<TCreate>;
  updateSchema?: z.ZodSchema<TUpdate>;
  softDelete?: boolean;
}

// ──────────────────────────────────────
// バリデーションユーティリティ
// ──────────────────────────────────────

/** Zod バリデーション結果を統一エラーに変換 */
function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'VALIDATION_ERROR',
      message: 'バリデーションエラー',
      data: { errors: result.error.flatten().fieldErrors },
    });
  }
  return result.data;
}

/** ULID パラメータを検証 */
function validateIdParam(event: H3Event, paramName = 'id'): string {
  const id = getRouterParam(event, paramName);
  if (!id || id.length !== 26) {
    throw createError({
      statusCode: 400,
      statusMessage: 'VALIDATION_ERROR',
      message: 'IDは26文字の ULID 形式である必要があります',
    });
  }
  return id;
}

/** ページネーションパラメータをパース */
function parsePagination(event: H3Event): { page: number; perPage: number; offset: number } {
  const query = getQuery(event);
  const page = Math.max(1, Number(query.page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(query.per_page) || 20));
  return { page, perPage, offset: (page - 1) * perPage };
}

// ──────────────────────────────────────
// CRUD ハンドラーファクトリ（§8.2）
// ──────────────────────────────────────

export function createCrudHandlers<
  TCreate extends Record<string, unknown> = Record<string, unknown>,
  TUpdate extends Record<string, unknown> = Record<string, unknown>,
>(options: CrudHandlerOptions<TCreate, TUpdate>) {
  const {
    table,
    resource,
    resourceNameJa,
    createSchema,
    updateSchema,
    softDelete = true,
  } = options;

  // ──── 一覧取得 ────

  const list = defineEventHandler(async (event: H3Event) => {
    const authCtx = await requirePermission(event, 'read', resource);
    const { page, perPage, offset } = parsePagination(event);

    const conditions: SQL[] = [eq(table.tenantId, authCtx.tenantId)];

    // 論理削除対応テーブルの場合、deletedAt が null のもののみ返す
    if (softDelete && 'deletedAt' in table) {
      const deletable = table as PgTable & SoftDeletableTable;
      conditions.push(eq(deletable.deletedAt, null as unknown as string));
    }

    const whereClause = conditions.length === 1 ? conditions[0]! : and(...conditions)!;

    const [data, totalResult] = await Promise.all([
      db.select()
        .from(table)
        .where(whereClause)
        .limit(perPage)
        .offset(offset),
      db.select({ count: count() })
        .from(table)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      data,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    };
  });

  // ──── 詳細取得 ────

  const get = defineEventHandler(async (event: H3Event) => {
    const authCtx = await requirePermission(event, 'read', resource);
    const id = validateIdParam(event);

    const conditions: SQL[] = [
      eq(table.id, id),
      eq(table.tenantId, authCtx.tenantId),
    ];

    if (softDelete && 'deletedAt' in table) {
      const deletable = table as PgTable & SoftDeletableTable;
      conditions.push(eq(deletable.deletedAt, null as unknown as string));
    }

    const [data] = await db.select()
      .from(table)
      .where(and(...conditions)!);

    if (!data) {
      throw createError({
        statusCode: 404,
        statusMessage: 'NOT_FOUND',
        message: `${resourceNameJa}が見つかりません`,
      });
    }

    return { data };
  });

  // ──── 新規作成 ────

  const create = defineEventHandler(async (event: H3Event) => {
    const authCtx = await requirePermission(event, 'create', resource);
    const body = await readBody(event);

    const validated = createSchema ? validateBody(createSchema, body) : body as TCreate;

    const [data] = await db.insert(table)
      .values({
        ...validated,
        id: ulid(),
        tenantId: authCtx.tenantId,
        createdBy: authCtx.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Record<string, unknown>)
      .returning();

    setResponseStatus(event, 201);

    return { data };
  });

  // ──── 更新 ────

  const update = defineEventHandler(async (event: H3Event) => {
    const authCtx = await requirePermission(event, 'update', resource);
    const id = validateIdParam(event);
    const body = await readBody(event);

    const validated = updateSchema ? validateBody(updateSchema, body) : body as TUpdate;

    // 既存データを取得
    const [existing] = await db.select()
      .from(table)
      .where(and(
        eq(table.id, id),
        eq(table.tenantId, authCtx.tenantId),
      )!);

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'NOT_FOUND',
        message: `${resourceNameJa}が見つかりません`,
      });
    }

    // 楽観的ロックチェック（§BR-004）
    const validatedRecord = validated as Record<string, unknown>;
    if (validatedRecord.updatedAt) {
      const row = existing as unknown as RowWithUpdatedAt;
      const clientUpdatedAt = new Date(validatedRecord.updatedAt as string).getTime();
      const serverUpdatedAt = row.updatedAt.getTime();

      if (clientUpdatedAt !== serverUpdatedAt) {
        throw createError({
          statusCode: 409,
          statusMessage: 'CONFLICT',
          message: 'このリソースは他のユーザーによって更新されています。最新のデータをリロードしてください。',
          data: { serverUpdatedAt: row.updatedAt.toISOString() },
        });
      }

      // updatedAt はサーバー側で設定するため削除
      delete validatedRecord.updatedAt;
    }

    const [data] = await db.update(table)
      .set({
        ...validatedRecord,
        updatedAt: new Date(),
      } as Record<string, unknown>)
      .where(eq(table.id, id))
      .returning();

    return { data };
  });

  // ──── 論理削除 ────

  const remove = defineEventHandler(async (event: H3Event) => {
    const authCtx = await requirePermission(event, 'delete', resource);
    const id = validateIdParam(event);

    // 対象リソースの存在確認
    const [existing] = await db.select()
      .from(table)
      .where(and(
        eq(table.id, id),
        eq(table.tenantId, authCtx.tenantId),
      )!);

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'NOT_FOUND',
        message: `${resourceNameJa}が見つかりません`,
      });
    }

    if (softDelete && 'deletedAt' in table) {
      // パターンB: deleted_at タイムスタンプ
      const [data] = await db.update(table)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        } as Record<string, unknown>)
        .where(eq(table.id, id))
        .returning();

      return { data };
    }

    // フォールバック: 物理削除は禁止（§BR-001）
    throw createError({
      statusCode: 500,
      statusMessage: 'INTERNAL_ERROR',
      message: 'テーブルが論理削除に対応していません',
    });
  });

  // ──── 復元 ────

  const restore = defineEventHandler(async (event: H3Event) => {
    const authCtx = await requirePermission(event, 'update', resource);
    const id = validateIdParam(event);

    if (!softDelete || !('deletedAt' in table)) {
      throw createError({
        statusCode: 500,
        statusMessage: 'INTERNAL_ERROR',
        message: 'テーブルが論理削除復元に対応していません',
      });
    }

    const [data] = await db.update(table)
      .set({
        deletedAt: null,
        updatedAt: new Date(),
      } as Record<string, unknown>)
      .where(and(
        eq(table.id, id),
        eq(table.tenantId, authCtx.tenantId),
      )!)
      .returning();

    if (!data) {
      throw createError({
        statusCode: 404,
        statusMessage: 'NOT_FOUND',
        message: `${resourceNameJa}が見つかりません`,
      });
    }

    return { data };
  });

  return { list, get, create, update, remove, restore };
}
