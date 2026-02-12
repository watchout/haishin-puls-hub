// EVT-020-021 §6.4: 登壇者情報更新 API
// PATCH /api/v1/speakers/:id
import { eq, and } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { updateSpeakerSchema } from '~/server/utils/speaker-validation'
import { speaker } from '~/server/database/schema'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'update', 'speaker')
    const id = getRouterParam(h3Event, 'id')

    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR', message: '登壇者IDが指定されていません' })
    }

    const body = await readBody(h3Event)
    const parsed = updateSpeakerSchema.safeParse(body)
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: 'バリデーションエラー',
        data: { code: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors },
      })
    }

    // 既存レコード取得
    const [existing] = await db.select()
      .from(speaker)
      .where(and(eq(speaker.id, id), eq(speaker.tenantId, ctx.tenantId)))
      .limit(1)

    if (!existing) {
      throw createError({ statusCode: 404, statusMessage: 'NOT_FOUND', message: '登壇者が見つかりません' })
    }

    const data = parsed.data

    // snake_case → camelCase マッピング
    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (data.name !== undefined) updateData.name = data.name
    if (data.title !== undefined) updateData.title = data.title
    if (data.organization !== undefined) updateData.organization = data.organization
    if (data.bio !== undefined) updateData.bio = data.bio
    if (data.photo_url !== undefined) updateData.photoUrl = data.photo_url
    if (data.presentation_title !== undefined) updateData.presentationTitle = data.presentation_title
    if (data.start_at !== undefined) updateData.startAt = data.start_at ? new Date(data.start_at) : null
    if (data.duration_minutes !== undefined) updateData.durationMinutes = data.duration_minutes
    if (data.format !== undefined) updateData.format = data.format
    if (data.materials_url !== undefined) updateData.materialsUrl = data.materials_url
    if (data.submission_status !== undefined) updateData.submissionStatus = data.submission_status
    if (data.sort_order !== undefined) updateData.sortOrder = data.sort_order

    const [updated] = await db.update(speaker)
      .set(updateData)
      .where(eq(speaker.id, id))
      .returning()

    return { data: updated }
  } catch (err) {
    handleApiError(err)
  }
})
