// VENUE-001-004: 配信パッケージ一覧取得 API
// GET /api/v1/streaming-packages
// 仕様書: §5 Streaming Package API - グローバル + 自テナント専用
import { eq, or, isNull, and, sql } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { streamingPackage } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  try {
    const ctx = await requirePermission(event, 'read', 'venue')
    const query = getQuery(event)

    const page = Math.max(1, Number(query.page) || 1)
    const perPage = Math.min(100, Math.max(1, Number(query.per_page) || 20))
    const offset = (page - 1) * perPage

    // グローバル（tenant_id IS NULL）+ 自テナント専用
    const baseCondition = and(
      or(
        isNull(streamingPackage.tenantId),
        eq(streamingPackage.tenantId, ctx.tenantId),
      ),
      eq(streamingPackage.isActive, true),
    )

    const [data, countResult] = await Promise.all([
      db.select()
        .from(streamingPackage)
        .where(baseCondition)
        .orderBy(streamingPackage.sortOrder)
        .limit(perPage)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(streamingPackage)
        .where(baseCondition),
    ])

    const total = countResult[0]?.count ?? 0

    return {
      data,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    }
  } catch (err) {
    handleApiError(err)
  }
})
