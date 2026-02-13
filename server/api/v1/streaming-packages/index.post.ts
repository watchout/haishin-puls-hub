// VENUE-001-004: 配信パッケージ作成 API
// POST /api/v1/streaming-packages
// 仕様書: §5 Streaming Package API - POST
import { ulid } from 'ulid'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { createStreamingPackageSchema } from '~/server/utils/venue-validation'
import { streamingPackage } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  try {
    const ctx = await requirePermission(event, 'create', 'venue')
    const body = await readBody(event)

    // Zod バリデーション
    const parsed = createStreamingPackageSchema.safeParse(body)
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

    const data = parsed.data

    const result = await db.insert(streamingPackage)
      .values({
        id: ulid(),
        tenantId: ctx.tenantId,   // 自テナント専用
        name: data.name,
        description: data.description ?? null,
        items: data.items,
        basePrice: data.base_price,
        isActive: true,
        sortOrder: 0,
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
