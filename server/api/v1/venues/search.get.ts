// VENUE-001-004: 会場検索 API
// GET /api/v1/venues/search?area=tokyo&capacity=100
// 仕様書: §3-E #8, §3-H: 会場検索
import { eq, and, gte, lte, ilike, sql } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { venue } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  try {
    const ctx = await requirePermission(event, 'read', 'venue')
    const query = getQuery(event)

    const page = Math.max(1, Number(query.page) || 1)
    const perPage = Math.min(100, Math.max(1, Number(query.per_page) || 20))
    const offset = (page - 1) * perPage

    // 動的フィルタ構築
    const conditions = [
      eq(venue.tenantId, ctx.tenantId),
      eq(venue.isActive, true),
    ]

    // エリア検索（住所の部分一致）
    if (query.area && typeof query.area === 'string') {
      conditions.push(ilike(venue.address as never, `%${query.area}%` as never))
    }

    // 収容人数の最小値
    if (query.capacity_min || query.capacity) {
      const minCapacity = Number(query.capacity_min || query.capacity) || 0
      if (minCapacity > 0) {
        conditions.push(gte(venue.capacity as never, minCapacity as never))
      }
    }

    // 収容人数の最大値
    if (query.capacity_max) {
      const maxCapacity = Number(query.capacity_max) || 0
      if (maxCapacity > 0) {
        conditions.push(lte(venue.capacity as never, maxCapacity as never))
      }
    }

    const whereClause = and(...conditions)

    const [data, countResult] = await Promise.all([
      db.select()
        .from(venue)
        .where(whereClause)
        .limit(perPage)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(venue)
        .where(whereClause),
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
