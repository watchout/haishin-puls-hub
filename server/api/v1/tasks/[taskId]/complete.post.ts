// EVT-010-014 §5.4: タスク完了 API
// POST /api/v1/tasks/:taskId/complete
import { eq, and } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { task } from '~/server/database/schema'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'update', 'task')
    const taskId = getRouterParam(h3Event, 'taskId')

    if (!taskId) {
      throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR', message: 'タスクIDが指定されていません' })
    }

    // 存在確認 + テナント分離
    const existing = await db.select()
      .from(task)
      .where(and(eq(task.id, taskId), eq(task.tenantId, ctx.tenantId)))
      .limit(1)

    if (existing.length === 0) {
      throw createError({ statusCode: 404, statusMessage: 'NOT_FOUND', message: 'タスクが見つかりません' })
    }

    // §5.4: 既に完了済みの場合は 409
    if (existing[0]!.status === 'completed') {
      throw createError({ statusCode: 409, statusMessage: 'CONFLICT', message: 'このタスクは既に完了しています' })
    }

    const result = await db.update(task)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      } as never)
      .where(eq(task.id, taskId))
      .returning()

    return { task: result[0] }
  } catch (err) {
    handleApiError(err)
  }
})
