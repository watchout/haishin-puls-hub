// EVT-030 §5.1: 参加申込（認証不要 Public API）
// POST /api/v1/portal/:slug/register
import { eq, and } from 'drizzle-orm'
import { ulid } from 'ulid'
import { db } from '~/server/utils/db'
import { event } from '~/server/database/schema/event'
import { participant } from '~/server/database/schema/participant'
import { registerParticipantSchema, generateCheckinCode } from '~/server/utils/participant-validation'
import { generateQRCodeString } from '~/server/utils/qr'
import { handleApiError } from '~/server/utils/api-error'

export default defineEventHandler(async (h3Event) => {
  try {
    const slug = getRouterParam(h3Event, 'slug')

    if (!slug) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: 'スラッグが指定されていません',
      })
    }

    // イベント取得
    const events = await db.select()
      .from(event)
      .where(eq(event.portalSlug, slug))
      .limit(1)

    if (events.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'PORTAL_NOT_FOUND',
        message: 'ポータルが見つかりません',
      })
    }

    const evt = events[0]!

    // ポータル公開チェック
    const settings = (evt.settings as Record<string, unknown>) ?? {}
    if (!settings.portal_published) {
      throw createError({
        statusCode: 404,
        statusMessage: 'PORTAL_NOT_FOUND',
        message: 'ポータルが見つかりません',
      })
    }

    // キャンセルチェック
    if (evt.status === 'cancelled') {
      throw createError({
        statusCode: 400,
        statusMessage: 'EVENT_CANCELLED',
        message: 'このイベントはキャンセルされています',
      })
    }

    // バリデーション
    const body = await readBody(h3Event)
    const parsed = registerParticipantSchema.safeParse(body)
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
          eq(participant.eventId, evt.id),
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

    // 参加者登録
    const participantId = ulid()
    const qrCode = generateQRCodeString(participantId, evt.id)
    const checkinCode = generateCheckinCode()

    const result = await db.insert(participant)
      .values({
        id: participantId,
        eventId: evt.id,
        tenantId: evt.tenantId,
        name: data.name,
        email: data.email,
        organization: data.organization ?? null,
        participationType: data.participation_type,
        registrationStatus: 'registered',
        qrCode,
        customFields: { checkin_code: checkinCode, job_title: data.job_title, phone: data.phone },
        registeredAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never)
      .returning()

    // TODO: 確認メール送信（受付票PDF添付）— メール基盤完成後に実装

    setResponseStatus(h3Event, 201)
    return {
      participant_id: result[0]!.id,
      qr_code: qrCode,
      checkin_code: checkinCode,
      message: '申込が完了しました。確認メールをご確認ください。',
    }
  } catch (err) {
    handleApiError(err)
  }
})
