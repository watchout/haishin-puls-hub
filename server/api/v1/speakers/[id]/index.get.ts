// EVT-020-021 §6.2: 登壇者詳細取得 API
// GET /api/v1/speakers/:id
import { eq, and } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { speaker } from '~/server/database/schema'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'read', 'speaker')
    const id = getRouterParam(h3Event, 'id')

    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR', message: '登壇者IDが指定されていません' })
    }

    const [record] = await db.select()
      .from(speaker)
      .where(and(eq(speaker.id, id), eq(speaker.tenantId, ctx.tenantId)))
      .limit(1)

    if (!record) {
      throw createError({ statusCode: 404, statusMessage: 'NOT_FOUND', message: '登壇者が見つかりません' })
    }

    return { data: record }
  } catch (err) {
    handleApiError(err)
  }
})
