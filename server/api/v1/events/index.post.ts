// EVT-001-005 §5: POST /api/v1/events - イベント作成
// organizer, event_planner のみ

import { eq, and } from 'drizzle-orm'
import { ulid } from 'ulid'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { createEventSchema } from '~/server/utils/event-validation'
import { event, venue } from '~/server/database/schema'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'create', 'event')
    const body = await readBody(h3Event)

    // Zod バリデーション
    const parsed = createEventSchema.safeParse(body)
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

    // venue_id が指定されている場合、存在確認（同一テナント内）
    if (data.venue_id) {
      const venueResult = await db.select({ id: venue.id })
        .from(venue)
        .where(and(
          eq(venue.id, data.venue_id),
          eq(venue.tenantId, ctx.tenantId),
        ))
        .limit(1)

      if (venueResult.length === 0) {
        throw createError({
          statusCode: 404,
          statusMessage: 'VENUE_NOT_FOUND',
          message: '指定された会場が見つかりません',
        })
      }
    }

    const result = await db.insert(event)
      .values({
        id: ulid(),
        tenantId: ctx.tenantId,
        venueId: data.venue_id ?? null,
        title: data.title,
        description: data.description ?? null,
        eventType: data.event_type,
        format: data.format,
        status: 'draft',
        startAt: data.start_at ? new Date(data.start_at) : null,
        endAt: data.end_at ? new Date(data.end_at) : null,
        capacityOnsite: data.capacity_onsite ?? null,
        capacityOnline: data.capacity_online ?? null,
        budgetMin: data.budget_min ?? null,
        budgetMax: data.budget_max ?? null,
        goal: data.goal ?? null,
        targetAudience: data.target_audience ?? null,
        dateCandidates: data.date_candidates ?? null,
        aiSuggestions: data.ai_suggestions ?? null,
        settings: data.settings ?? {},
        aiGenerated: data.ai_generated ? {} : null,
        createdBy: ctx.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never)
      .returning()

    setResponseStatus(h3Event, 201)
    return { data: result[0] }
  } catch (err) {
    handleApiError(err)
  }
})
