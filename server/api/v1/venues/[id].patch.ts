// VENUE-001-004: 会場更新 API
// PATCH /api/v1/venues/:id
// 仕様書: §5 Venue API - PATCH /api/v1/venues/:id
import { eq, and } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { updateVenueSchema } from '~/server/utils/venue-validation'
import { venue } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  try {
    const ctx = await requirePermission(event, 'update', 'venue')
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
    const parsed = updateVenueSchema.safeParse(body)
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

    // 楽観的ロック
    const record = existing[0]
    if (body.updated_at && record.updatedAt) {
      const clientTime = new Date(body.updated_at as string).getTime()
      const serverTime = record.updatedAt.getTime()
      if (clientTime !== serverTime) {
        throw createError({
          statusCode: 409,
          statusMessage: 'CONFLICT',
          message: 'このリソースは他のユーザーによって更新されています。',
        })
      }
    }

    // フィールドマッピング (snake_case → camelCase)
    const data = parsed.data
    const updatePayload: Record<string, unknown> = { updatedAt: new Date() }

    if (data.name !== undefined) updatePayload.name = data.name
    if (data.branch_name !== undefined) updatePayload.branchName = data.branch_name
    if (data.address !== undefined) updatePayload.address = data.address
    if (data.latitude !== undefined) updatePayload.latitude = data.latitude?.toString() ?? null
    if (data.longitude !== undefined) updatePayload.longitude = data.longitude?.toString() ?? null
    if (data.capacity !== undefined) updatePayload.capacity = data.capacity
    if (data.hourly_rate !== undefined) updatePayload.hourlyRate = data.hourly_rate
    if (data.phone !== undefined) updatePayload.phone = data.phone
    if (data.description !== undefined) updatePayload.description = data.description
    if (data.floor_map_url !== undefined) updatePayload.floorMapUrl = data.floor_map_url
    if (data.equipment !== undefined) updatePayload.equipment = data.equipment
    if (data.wifi_info !== undefined) updatePayload.wifiInfo = data.wifi_info
    if (data.notes !== undefined) updatePayload.notes = data.notes

    const result = await db.update(venue)
      .set(updatePayload as never)
      .where(eq(venue.id, id))
      .returning()

    return { data: result[0] }
  } catch (err) {
    handleApiError(err)
  }
})
