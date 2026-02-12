// LIST-001-003 サーバー側リストクエリヘルパー
// 仕様書: docs/design/features/common/LIST-001-003_list-operations.md §5, §9.2
//
// 各リスト API エンドポイントが共通で使うクエリパラメータのパース・バリデーション・
// ページネーション計算・ソート適用を行う。

import { z } from 'zod'
import { asc, desc, sql, and, or, eq, gte, lte, gt, lt, ilike } from 'drizzle-orm'
import type { PgTable, PgColumn } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'
import { db } from './db'

// ──────────────────────────────────────
// 型定義
// ──────────────────────────────────────

/** オフセットベースページネーション結果 (§5.2) */
export interface OffsetPaginationResult<T> {
  data: T[]
  pagination: {
    total: number
    page: number
    per_page: number
    total_pages: number
  }
}

/** カーソルベースページネーション結果 (§5.2) */
export interface CursorPaginationResult<T> {
  data: T[]
  next_cursor: string | null
  has_more: boolean
}

/** リストクエリオプション */
export interface ListQueryOptions {
  /** 許可するソートカラム名 */
  allowedSortColumns: string[]
  /** フリーテキスト検索対象カラム（ILIKE 適用） */
  searchColumns?: PgColumn[]
  /** デフォルトのソートカラム */
  defaultSort?: string
  /** デフォルトのソート順 */
  defaultOrder?: 'asc' | 'desc'
}

// ──────────────────────────────────────
// バリデーションスキーマ (§3.5)
// ──────────────────────────────────────

/** オフセットベースのクエリパラメータスキーマ */
export const offsetPaginationSchema = z.object({
  page: z.coerce.number().int().min(1, 'page must be a positive integer').default(1),
  per_page: z.coerce.number().int().min(1, 'per_page must be between 1 and 100').max(100, 'per_page must be between 1 and 100').default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  q: z.string().max(200).optional(),
})

/** カーソルベースのクエリパラメータスキーマ */
export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
})

// ──────────────────────────────────────
// バリデーション関数
// ──────────────────────────────────────

/**
 * リストクエリパラメータをバリデーション
 *
 * §3.5 境界値 / §3.6 例外レスポンスに基づくエラーハンドリング:
 * - page < 1 → 400 INVALID_PAGE
 * - per_page < 1 or > 100 → 400 INVALID_PER_PAGE
 * - sort が許可リスト外 → 400 INVALID_SORT
 * - order が asc/desc 以外 → 400 INVALID_ORDER
 */
export function validateListQuery(
  rawQuery: Record<string, unknown>,
  options: ListQueryOptions,
): z.infer<typeof offsetPaginationSchema> & Record<string, unknown> {
  // 基本バリデーション
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

  // ソートカラムバリデーション
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

  // その他のフィルタパラメータをそのまま渡す
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

// ──────────────────────────────────────
// クエリビルダー
// ──────────────────────────────────────

/**
 * オフセットベースのリストクエリを実行
 *
 * BR-001: テナント分離 (tenant_id 必須)
 * BR-002: デフォルトソート (created_at desc)
 * BR-003: per_page 上限 (100)
 * BR-004: 空検索は全件返却
 */
export async function executeListQuery<T>(
  table: PgTable,
  tenantId: string,
  params: z.infer<typeof offsetPaginationSchema> & Record<string, unknown>,
  options: ListQueryOptions & {
    /** 追加の WHERE 条件 */
    additionalConditions?: SQL[]
  } = { allowedSortColumns: ['created_at'] },
): Promise<OffsetPaginationResult<T>> {
  const t = table as unknown as Record<string, PgColumn>
  const conditions: SQL[] = []

  // テナント分離
  conditions.push(eq(t.tenantId as PgColumn, tenantId as never))

  // フリーテキスト検索 (BR-004: 空文字はスキップ)
  if (params.q && params.q.trim() !== '' && options.searchColumns && options.searchColumns.length > 0) {
    const searchConditions = options.searchColumns.map(col =>
      ilike(col, `%${params.q}%`),
    )
    if (searchConditions.length === 1) {
      conditions.push(searchConditions[0]!)
    } else if (searchConditions.length > 1) {
      const orCondition = or(...searchConditions)
      if (orCondition) {
        conditions.push(orCondition)
      }
    }
  }

  // 追加条件
  if (options.additionalConditions) {
    conditions.push(...options.additionalConditions)
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // ソート
  const sortCol = t[params.sort || 'createdAt']
  const orderFn = params.order === 'asc' ? asc : desc
  const orderBy = sortCol ? orderFn(sortCol as PgColumn) : desc(t.createdAt as PgColumn)

  // ページネーション計算
  const page = params.page || 1
  const perPage = Math.min(params.per_page || 20, 100)
  const offset = (page - 1) * perPage

  // データ取得 + カウント並列実行
  const [data, countResult] = await Promise.all([
    db.select()
      .from(table)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(perPage)
      .offset(offset) as Promise<T[]>,
    db.select({ count: sql<number>`count(*)::int` })
      .from(table)
      .where(whereClause),
  ])

  const total = countResult[0]?.count ?? 0

  return {
    data,
    pagination: {
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
  }
}

// ──────────────────────────────────────
// フィルタヘルパー
// ──────────────────────────────────────

/**
 * カンマ区切りの値を OR 条件に変換 (FR-004)
 */
export function multiValueFilter(column: PgColumn, value: string | undefined): SQL | undefined {
  if (!value || value.trim() === '') return undefined
  const values = value.split(',').map(v => v.trim()).filter(Boolean)
  if (values.length === 0) return undefined
  if (values.length === 1) return eq(column, values[0] as never)
  return or(...values.map(v => eq(column, v as never)))
}

/**
 * 範囲フィルタを生成 (FR-005)
 */
export function rangeFilter(
  column: PgColumn,
  params: Record<string, unknown>,
  paramName: string,
): SQL[] {
  const conditions: SQL[] = []
  const gteValue = params[`${paramName}_gte`]
  const lteValue = params[`${paramName}_lte`]
  const gtValue = params[`${paramName}_gt`]
  const ltValue = params[`${paramName}_lt`]

  if (gteValue) conditions.push(gte(column, new Date(gteValue as string) as never))
  if (lteValue) conditions.push(lte(column, new Date(lteValue as string) as never))
  if (gtValue) conditions.push(gt(column, new Date(gtValue as string) as never))
  if (ltValue) conditions.push(lt(column, new Date(ltValue as string) as never))

  return conditions
}
