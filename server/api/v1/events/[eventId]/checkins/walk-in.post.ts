// EVT-031 §5.2: 当日参加者登録 + チェックイン（認証必須: staff/admin）
// POST /api/v1/events/:eid/checkins/walk-in
import { eq, and } from 'drizzle-orm'
import { ulid } from 'ulid'
import { db } from '~/server/utils/db'
import { event } from '~/server/database/schema/event'
import { participant, checkin } from '~/server/database/schema/participant'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { walkInRegistrationSchema, generateCheckinCode } from '~/server/utils/participant-validation'
import { generateQRCodeString } from '~/server/utils/qr'

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

    // イベント存在チェック
    const events = await db.select({ id: event.id })
      .from(event)
      .where(
        and(
          eq(event.id, eventId),
          eq(event.tenantId, ctx.tenantId),
        ),
      )
      .limit(1)

    if (events.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'NOT_FOUND',
        message: 'イベントが見つかりません',
      })
    }

    // バリデーション
    const body = await readBody(h3Event)
    const parsed = walkInRegistrationSchema.safeParse(body)
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: '入力内容に誤りがあります',
        data: {
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        },
      })
    }

    const data = parsed.data

    // 同一イベント内メール重複チェック
    const existing = await db.select({ id: participant.id })
      .from(participant)
      .where(
        and(
          eq(participant.eventId, eventId),
          eq(participant.email, data.email),
        ),
      )
      .limit(1)

    if (existing.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'DUPLICATE_EMAIL',
        message: 'このメールアドレスは既に登録されています',
      })
    }

    // 参加者登録 + チェックイン同時作成 (FR-9.3)
    const participantId = ulid()
    const checkinId = ulid()
    const now = new Date()
    const qrCode = generateQRCodeString(participantId, eventId)
    const checkinCode = generateCheckinCode()

    // 参加者作成
    await db.insert(participant)
      .values({
        id: participantId,
        eventId,
        tenantId: ctx.tenantId,
        name: data.name,
        email: data.email,
        organization: data.organization ?? null,
        participationType: data.participation_type,
        registrationStatus: 'confirmed',
        qrCode,
        customFields: { checkin_code: checkinCode },
        registeredAt: now,
        createdAt: now,
        updatedAt: now,
      } as never)

    // チェックイン作成（method = walk_in）
    await db.insert(checkin)
      .values({
        id: checkinId,
        participantId,
        eventId,
        tenantId: ctx.tenantId,
        checkedInAt: now,
        method: 'walk_in',
        createdAt: now,
      } as never)

    setResponseStatus(h3Event, 201)
    return {
      participant_id: participantId,
      checkin_id: checkinId,
      checked_in_at: now.toISOString(),
    }
  } catch (err) {
    handleApiError(err)
  }
})
