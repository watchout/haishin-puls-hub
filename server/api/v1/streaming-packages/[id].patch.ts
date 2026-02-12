// VENUE-001-004: 配信パッケージ更新 API
// PATCH /api/v1/streaming-packages/:id
// 仕様書: §5 Streaming Package API - PATCH
import { eq, and } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { updateStreamingPackageSchema } from '~/server/utils/venue-validation'
import { streamingPackage } from '~/server/database/schema'

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
    const parsed = updateStreamingPackageSchema.safeParse(body)
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

    // 存在確認（自テナントのパッケージのみ更新可能）
    const existing = await db.select()
      .from(streamingPackage)
      .where(and(
        eq(streamingPackage.id, id),
        eq(streamingPackage.tenantId, ctx.tenantId),
      ))
      .limit(1)

    if (existing.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'NOT_FOUND',
        message: '指定された配信パッケージが見つかりません',
      })
    }

    const data = parsed.data
    const updatePayload: Record<string, unknown> = { updatedAt: new Date() }

    if (data.name !== undefined) updatePayload.name = data.name
    if (data.description !== undefined) updatePayload.description = data.description
    if (data.items !== undefined) updatePayload.items = data.items
    if (data.base_price !== undefined) updatePayload.basePrice = data.base_price
    if (data.is_active !== undefined) updatePayload.isActive = data.is_active

    const result = await db.update(streamingPackage)
      .set(updatePayload as never)
      .where(eq(streamingPackage.id, id))
      .returning()

    return { data: result[0] }
  } catch (err) {
    handleApiError(err)
  }
})
