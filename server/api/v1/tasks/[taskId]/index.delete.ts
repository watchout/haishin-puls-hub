// EVT-010-014 §5.5: タスク削除 API
// DELETE /api/v1/tasks/:taskId
import { eq, and } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { task } from '~/server/database/schema'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'delete', 'task')
    const taskId = getRouterParam(h3Event, 'taskId')

    if (!taskId) {
      throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR', message: 'タスクIDが指定されていません' })
    }

    // 存在確認 + テナント分離
    const existing = await db.select({ id: task.id })
      .from(task)
      .where(and(eq(task.id, taskId), eq(task.tenantId, ctx.tenantId)))
      .limit(1)

    if (existing.length === 0) {
      throw createError({ statusCode: 404, statusMessage: 'NOT_FOUND', message: 'タスクが見つかりません' })
    }

    await db.delete(task).where(eq(task.id, taskId))

    return { success: true }
  } catch (err) {
    handleApiError(err)
  }
})
