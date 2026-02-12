// EVT-020-021 §6.2: 登壇者一覧取得 API
// GET /api/v1/events/:eventId/speakers
import { eq, and, asc, desc } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { speaker, event } from '~/server/database/schema'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'read', 'speaker')
    const eventId = getRouterParam(h3Event, 'eventId')

    if (!eventId) {
      throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR', message: 'イベントIDが指定されていません' })
    }

    // イベント存在確認 + テナント分離
    const eventRecord = await db.select({ id: event.id })
      .from(event)
      .where(and(eq(event.id, eventId), eq(event.tenantId, ctx.tenantId)))
      .limit(1)

    if (eventRecord.length === 0) {
      throw createError({ statusCode: 404, statusMessage: 'NOT_FOUND', message: 'イベントが見つかりません' })
    }

    const query = getQuery(h3Event)

    // フィルタ構築
    const conditions = [eq(speaker.eventId, eventId), eq(speaker.tenantId, ctx.tenantId)]

    if (query.status && typeof query.status === 'string') {
      conditions.push(eq(speaker.submissionStatus, query.status))
    }

    const whereClause = and(...conditions)

    // ソート
    const sortField = query.sort === 'name' ? speaker.name
      : query.sort === 'start_at' ? speaker.startAt
        : speaker.sortOrder

    const orderDir = query.order === 'desc' ? desc(sortField) : asc(sortField)

    const speakers = await db.select()
      .from(speaker)
      .where(whereClause)
      .orderBy(orderDir)

    return { data: speakers }
  } catch (err) {
    handleApiError(err)
  }
})
