// VENUE-001-004: 見積り作成 API
// POST /api/v1/quotes
// 仕様書: §5 Quote API - POST /api/v1/quotes
import { eq, and, sql } from 'drizzle-orm'
import { ulid } from 'ulid'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { createQuoteSchema } from '~/server/utils/venue-validation'
import { estimate, venue, event } from '~/server/database/schema'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'create', 'venue')
    const body = await readBody(h3Event)

    // Zod バリデーション
    const parsed = createQuoteSchema.safeParse(body)
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

    // 会場存在確認 + テナント分離
    const venueRecord = await db.select({ id: venue.id })
      .from(venue)
      .where(and(
        eq(venue.id, data.venue_id),
        eq(venue.tenantId, ctx.tenantId),
      ))
      .limit(1)

    if (venueRecord.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'NOT_FOUND',
        message: '指定された会場が見つかりません',
      })
    }

    // イベント存在確認 + テナント分離
    const eventRecord = await db.select({ id: event.id })
      .from(event)
      .where(and(
        eq(event.id, data.event_id),
        eq(event.tenantId, ctx.tenantId),
      ))
      .limit(1)

    if (eventRecord.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'NOT_FOUND',
        message: '指定されたイベントが見つかりません',
      })
    }

    // 見積番号の自動採番: Q-YYYYMMDD-NNN
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]!.replace(/-/g, '')
    const countResult = await db.select({
      count: sql<number>`count(*)::int`,
    })
      .from(estimate)
      .where(eq(estimate.tenantId, ctx.tenantId))

    const seq = (countResult[0]?.count ?? 0) + 1
    const quoteNumber = `Q-${dateStr}-${String(seq).padStart(3, '0')}`

    // 有効期限計算
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + (data.valid_days ?? 30))

    const result = await db.insert(estimate)
      .values({
        id: ulid(),
        eventId: data.event_id,
        tenantId: ctx.tenantId,
        title: quoteNumber,
        items: data.items,
        totalAmount: data.total,
        status: 'draft',
        generatedBy: 'manual',
        createdBy: ctx.userId,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never)
      .returning()

    setResponseStatus(h3Event, 201)
    return {
      data: {
        ...result[0],
        quote_number: quoteNumber,
        subtotal: data.subtotal,
        tax: data.tax,
        valid_until: validUntil.toISOString(),
      },
    }
  } catch (err) {
    handleApiError(err)
  }
})
