// EVT-020-021 §6.3: 登壇者追加 API
// POST /api/v1/events/:eventId/speakers
import { eq, and } from 'drizzle-orm'
import { ulid } from 'ulid'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { createSpeakerSchema } from '~/server/utils/speaker-validation'
import { speaker, event } from '~/server/database/schema'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'create', 'speaker')
    const eventId = getRouterParam(h3Event, 'eventId')

    if (!eventId) {
      throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR', message: 'イベントIDが指定されていません' })
    }

    const body = await readBody(h3Event)
    const parsed = createSpeakerSchema.safeParse(body ?? {})
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: 'バリデーションエラー',
        data: { code: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors },
      })
    }

    const data = parsed.data

    // イベント存在確認 + テナント分離
    const eventRecord = await db.select({ id: event.id, title: event.title, startAt: event.startAt, status: event.status })
      .from(event)
      .where(and(eq(event.id, eventId), eq(event.tenantId, ctx.tenantId)))
      .limit(1)

    if (eventRecord.length === 0) {
      throw createError({ statusCode: 404, statusMessage: 'NOT_FOUND', message: 'イベントが見つかりません' })
    }

    // §3-G: 同一イベント内で同一メールアドレスの重複チェック（CON-005: emailはDBに保存しない）
    // → メールアドレスはspeakerテーブルに永続化されないため、重複チェックは行わない

    // speaker.id がフォームトークンを兼ねる (§13.4)
    const speakerId = ulid()

    // 既存登壇者数から sort_order を計算
    const existingSpeakers = await db.select({ id: speaker.id })
      .from(speaker)
      .where(eq(speaker.eventId, eventId))

    const sortOrder = existingSpeakers.length

    const created = (await db.insert(speaker)
      .values({
        id: speakerId,
        eventId,
        tenantId: ctx.tenantId,
        name: data.name ?? '',
        submissionStatus: 'pending',
        sortOrder,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning())[0]!

    // TODO: メール送信機能 (§8.2) - data.email が存在する場合にフォームURLを送信
    const emailSent = false

    const baseUrl = getRequestURL(h3Event).origin
    const formUrl = `${baseUrl}/speaker-form/${speakerId}`

    setResponseStatus(h3Event, 201)
    return {
      data: {
        id: created.id,
        eventId: created.eventId,
        name: created.name,
        submissionStatus: created.submissionStatus,
        formToken: speakerId,
        formUrl,
        emailSent,
      },
    }
  } catch (err) {
    handleApiError(err)
  }
})
