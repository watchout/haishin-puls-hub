// VENUE-001-004: 会場作成 API
// POST /api/v1/venues
// 仕様書: §5 Venue API - POST /api/v1/venues
// §3-G: CONFLICT — 同一テナント内で会場名重複チェック
import { eq, and } from 'drizzle-orm'
import { ulid } from 'ulid'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { createVenueSchema } from '~/server/utils/venue-validation'
import { venue } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  try {
    const ctx = await requirePermission(event, 'create', 'venue')
    const body = await readBody(event)

    // Zod バリデーション
    const parsed = createVenueSchema.safeParse(body)
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

    // §3-G #5: 同一テナント内で会場名重複チェック
    const existing = await db.select({ id: venue.id })
      .from(venue)
      .where(and(
        eq(venue.tenantId, ctx.tenantId),
        eq(venue.name, data.name),
      ))
      .limit(1)

    if (existing.length > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: 'CONFLICT',
        message: '同名の会場が既に存在します',
        data: {
          code: 'CONFLICT',
          details: { field: 'name', value: data.name },
        },
      })
    }

    const result = await db.insert(venue)
      .values({
        id: ulid(),
        tenantId: ctx.tenantId,
        name: data.name,
        branchName: data.branch_name ?? null,
        address: data.address ?? null,
        latitude: data.latitude?.toString() ?? null,
        longitude: data.longitude?.toString() ?? null,
        capacity: data.capacity ?? null,
        hourlyRate: data.hourly_rate ?? null,
        phone: data.phone ?? null,
        description: data.description ?? null,
        floorMapUrl: data.floor_map_url ?? null,
        equipment: data.equipment ?? [],
        wifiInfo: data.wifi_info ?? null,
        notes: data.notes ?? null,
        isActive: true,
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
