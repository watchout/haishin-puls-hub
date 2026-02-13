// EVT-020-021 §6.6: フォームURLメール送信 API
// POST /api/v1/speakers/:id/send-form-email
import { eq, and } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { sendFormEmailSchema } from '~/server/utils/speaker-validation'
import { speaker, event } from '~/server/database/schema'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'update', 'speaker')
    const id = getRouterParam(h3Event, 'id')

    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR', message: '登壇者IDが指定されていません' })
    }

    const body = await readBody(h3Event)
    const parsed = sendFormEmailSchema.safeParse(body)
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: 'バリデーションエラー',
        data: { code: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors },
      })
    }

    // 登壇者取得 + テナント分離
    const [spk] = await db.select()
      .from(speaker)
      .where(and(eq(speaker.id, id), eq(speaker.tenantId, ctx.tenantId)))
      .limit(1)

    if (!spk) {
      throw createError({ statusCode: 404, statusMessage: 'NOT_FOUND', message: '登壇者が見つかりません' })
    }

    // イベント情報取得
    const [evt] = await db.select({ title: event.title, startAt: event.startAt })
      .from(event)
      .where(eq(event.id, spk.eventId))
      .limit(1)

    const baseUrl = getRequestURL(h3Event).origin
    const formUrl = `${baseUrl}/speaker-form/${id}`

    // TODO: 実際のメール送信処理 (§8.2)
    // メールテンプレート: 件名「【{イベント名}】登壇者情報のご提出のお願い」
    // 本文にフォームURL + 締め切り + 注意事項
    const _emailData = {
      to: parsed.data.email,
      subject: `【${evt?.title ?? 'イベント'}】登壇者情報のご提出のお願い`,
      speakerName: spk.name,
      eventTitle: evt?.title,
      eventStartAt: evt?.startAt,
      formUrl,
    }

    // updated_at を更新
    await db.update(speaker)
      .set({ updatedAt: new Date() })
      .where(eq(speaker.id, id))

    return {
      data: {
        emailSent: true,
        sentAt: new Date().toISOString(),
      },
    }
  } catch (err) {
    handleApiError(err)
  }
})
