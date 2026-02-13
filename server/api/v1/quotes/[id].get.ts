// VENUE-001-004: 見積り詳細取得 API
// GET /api/v1/quotes/:id
// 仕様書: §5 Quote API - GET /api/v1/quotes/:id
import { eq, and } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { estimate } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  try {
    const ctx = await requirePermission(event, 'read', 'venue')
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: 'IDが指定されていません',
      })
    }

    const result = await db.select()
      .from(estimate)
      .where(and(
        eq(estimate.id, id),
        eq(estimate.tenantId, ctx.tenantId),
      ))
      .limit(1)

    if (result.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'NOT_FOUND',
        message: '指定された見積りが見つかりません',
      })
    }

    return { data: result[0] }
  } catch (err) {
    handleApiError(err)
  }
})
