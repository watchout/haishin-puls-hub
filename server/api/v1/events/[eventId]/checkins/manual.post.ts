// EVT-031 §5.2: 手動チェックイン（認証必須: staff/admin）
// POST /api/v1/events/:eid/checkins/manual
import { eq, and } from 'drizzle-orm'
import { ulid } from 'ulid'
import { db } from '~/server/utils/db'
import { participant, checkin } from '~/server/database/schema/participant'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { manualCheckinSchema } from '~/server/utils/participant-validation'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'create', 'participant')
    const eventId = getRouterParam(h3Event, 'eventId')

    if (!eventId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: 'イベントIDが指定されていません',
      })
    }

    // バリデーション
    const body = await readBody(h3Event)
    const parsed = manualCheckinSchema.safeParse(body)
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: '参加者IDは必須です',
        data: {
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        },
      })
    }

    // 参加者存在チェック
    const participants = await db.select()
      .from(participant)
      .where(
        and(
          eq(participant.id, parsed.data.participant_id),
          eq(participant.eventId, eventId),
          eq(participant.tenantId, ctx.tenantId),
        ),
      )
      .limit(1)

    if (participants.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'NOT_FOUND',
        message: '参加者が見つかりません',
      })
    }

    const prt = participants[0]!

    // 重複チェックイン防止
    const existingCheckin = await db.select({
      id: checkin.id,
      checkedInAt: checkin.checkedInAt,
    })
      .from(checkin)
      .where(
        and(
          eq(checkin.participantId, prt.id),
          eq(checkin.eventId, eventId),
        ),
      )
      .limit(1)

    if (existingCheckin.length > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: 'ALREADY_CHECKED_IN',
        message: 'この参加者は既にチェックイン済みです',
        data: {
          error: 'ALREADY_CHECKED_IN',
          checked_in_at: existingCheckin[0]!.checkedInAt.toISOString(),
        },
      })
    }

    // チェックイン記録作成
    const checkinId = ulid()
    const now = new Date()

    const result = await db.insert(checkin)
      .values({
        id: checkinId,
        participantId: prt.id,
        eventId,
        tenantId: ctx.tenantId,
        checkedInAt: now,
        method: 'manual',
        createdAt: now,
      } as never)
      .returning()

    setResponseStatus(h3Event, 201)
    return {
      checkin_id: result[0]!.id,
      participant: {
        id: prt.id,
        name: prt.name,
        organization: prt.organization,
      },
      checked_in_at: now.toISOString(),
    }
  } catch (err) {
    handleApiError(err)
  }
})
