// EVT-020-021 §6.8: 公開フォーム送信 API (認証不要)
// POST /api/v1/speaker-form/:token
// §FR-025: 同じトークンから2回目の送信時は上書き更新
import { eq } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { handleApiError } from '~/server/utils/api-error'
import { speakerFormSubmitSchema } from '~/server/utils/speaker-validation'
import { speaker, event } from '~/server/database/schema'

export default defineEventHandler(async (h3Event) => {
  try {
    const token = getRouterParam(h3Event, 'token')

    if (!token) {
      throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR', message: 'トークンが指定されていません' })
    }

    // speaker.id = token
    const [spk] = await db.select()
      .from(speaker)
      .where(eq(speaker.id, token))
      .limit(1)

    if (!spk) {
      throw createError({ statusCode: 404, statusMessage: 'NOT_FOUND', message: 'フォームが見つかりません' })
    }

    // イベントキャンセルチェック
    const [evt] = await db.select({ status: event.status })
      .from(event)
      .where(eq(event.id, spk.eventId))
      .limit(1)

    if (evt?.status === 'cancelled') {
      throw createError({ statusCode: 410, statusMessage: 'EVENT_CANCELLED', message: 'イベントはキャンセルされました' })
    }

    const body = await readBody(h3Event)
    const parsed = speakerFormSubmitSchema.safeParse(body)
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: 'バリデーションエラー',
        data: { code: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors },
      })
    }

    const data = parsed.data

    // TODO: ファイルアップロード処理 (§8.5)
    // multipart/form-data からの photo / materials ファイル処理

    // speaker レコード更新 (§FR-025: 上書き更新)
    const updateData: Record<string, unknown> = {
      name: data.name,
      submissionStatus: 'submitted', // §FR-024
      updatedAt: new Date(),
    }

    if (data.title !== undefined) updateData.title = data.title
    if (data.organization !== undefined) updateData.organization = data.organization
    if (data.bio !== undefined) updateData.bio = data.bio
    if (data.presentation_title !== undefined) updateData.presentationTitle = data.presentation_title
    if (data.start_at !== undefined) updateData.startAt = new Date(data.start_at)
    if (data.duration_minutes !== undefined) updateData.durationMinutes = data.duration_minutes
    if (data.format !== undefined) updateData.format = data.format

    await db.update(speaker)
      .set(updateData)
      .where(eq(speaker.id, token))

    return {
      data: {
        submissionStatus: 'submitted',
        submittedAt: new Date().toISOString(),
      },
      message: '登壇者情報を受け付けました',
    }
  } catch (err) {
    handleApiError(err)
  }
})
