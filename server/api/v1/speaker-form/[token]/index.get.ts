// EVT-020-021 §6.7: 公開フォーム情報取得 API (認証不要)
// GET /api/v1/speaker-form/:token
import { eq } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { handleApiError } from '~/server/utils/api-error'
import { speaker, event } from '~/server/database/schema'

export default defineEventHandler(async (h3Event) => {
  try {
    const token = getRouterParam(h3Event, 'token')

    if (!token) {
      throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR', message: 'トークンが指定されていません' })
    }

    // speaker.id = token (§13.4: ULIDがトークンを兼ねる)
    const [spk] = await db.select()
      .from(speaker)
      .where(eq(speaker.id, token))
      .limit(1)

    if (!spk) {
      throw createError({ statusCode: 404, statusMessage: 'NOT_FOUND', message: 'フォームが見つかりません' })
    }

    // イベント情報取得
    const [evt] = await db.select({
      title: event.title,
      startAt: event.startAt,
      status: event.status,
    })
      .from(event)
      .where(eq(event.id, spk.eventId))
      .limit(1)

    if (!evt) {
      throw createError({ statusCode: 404, statusMessage: 'NOT_FOUND', message: 'イベントが見つかりません' })
    }

    // §3-G: イベントキャンセル済み → 410
    if (evt.status === 'cancelled') {
      throw createError({ statusCode: 410, statusMessage: 'EVENT_CANCELLED', message: 'イベントはキャンセルされました' })
    }

    const baseUrl = getRequestURL(h3Event).origin
    const formUrl = `${baseUrl}/speaker-form/${token}`

    return {
      data: {
        event: {
          title: evt.title,
          startAt: evt.startAt,
          status: evt.status,
        },
        speaker: {
          id: spk.id,
          name: spk.name,
          title: spk.title,
          organization: spk.organization,
          bio: spk.bio,
          photoUrl: spk.photoUrl,
          presentationTitle: spk.presentationTitle,
          startAt: spk.startAt,
          durationMinutes: spk.durationMinutes,
          format: spk.format,
          submissionStatus: spk.submissionStatus,
        },
        formUrl,
      },
    }
  } catch (err) {
    handleApiError(err)
  }
})
