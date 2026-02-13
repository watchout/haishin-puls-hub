// EVT-010-014 §5.1: タスク一覧取得 API
// GET /api/v1/events/:eventId/tasks
import { eq, and } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { task, event } from '~/server/database/schema'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'read', 'task')
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
    const conditions = [eq(task.eventId, eventId), eq(task.tenantId, ctx.tenantId)]

    if (query.role && typeof query.role === 'string') {
      conditions.push(eq(task.assignedRole as never, query.role as never))
    }

    if (query.status && typeof query.status === 'string') {
      conditions.push(eq(task.status, query.status))
    }

    if (query.assigned_user_id && typeof query.assigned_user_id === 'string') {
      conditions.push(eq(task.assignedUserId as never, query.assigned_user_id as never))
    }

    const whereClause = and(...conditions)

    const tasks = await db.select()
      .from(task)
      .where(whereClause)
      .orderBy(task.sortOrder, task.dueAt)

    // サマリー計算
    const now = new Date()
    const summary = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      skipped: tasks.filter(t => t.status === 'skipped').length,
      overdue: tasks.filter(t => t.dueAt && t.dueAt < now && t.status !== 'completed' && t.status !== 'skipped').length,
    }

    return { tasks, summary }
  } catch (err) {
    handleApiError(err)
  }
})
