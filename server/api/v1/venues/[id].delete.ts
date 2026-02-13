// VENUE-001-004: 会場削除（論理削除 = 無効化）API
// DELETE /api/v1/venues/:id
// 仕様書: §5 Venue API - DELETE /api/v1/venues/:id
// §3-H: データは論理削除（is_active = false）
import { eq, and } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { venue } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  try {
    const ctx = await requirePermission(event, 'delete', 'venue')
    const id = getRouterParam(event, 'id')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: 'IDが指定されていません',
      })
    }

    // 存在確認 + テナント分離
    const existing = await db.select()
      .from(venue)
      .where(and(
        eq(venue.id, id),
        eq(venue.tenantId, ctx.tenantId),
      ))
      .limit(1)

    if (existing.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'NOT_FOUND',
        message: '指定された会場が見つかりません',
      })
    }

    // 論理削除: is_active = false
    await db.update(venue)
      .set({
        isActive: false,
        updatedAt: new Date(),
      } as never)
      .where(eq(venue.id, id))

    setResponseStatus(event, 200)
    return { success: true }
  } catch (err) {
    handleApiError(err)
  }
})
