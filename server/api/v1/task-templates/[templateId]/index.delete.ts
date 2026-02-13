// EVT-010-014 §5.10: タスクテンプレート削除 API
// DELETE /api/v1/task-templates/:templateId
import { eq, and } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { taskTemplate } from '~/server/database/schema'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'delete', 'task')
    const templateId = getRouterParam(h3Event, 'templateId')

    if (!templateId) {
      throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR', message: 'テンプレートIDが指定されていません' })
    }

    // 存在確認（自テナントのみ削除可能）
    const existing = await db.select({ id: taskTemplate.id })
      .from(taskTemplate)
      .where(and(
        eq(taskTemplate.id, templateId),
        eq(taskTemplate.tenantId, ctx.tenantId),
      ))
      .limit(1)

    if (existing.length === 0) {
      throw createError({ statusCode: 404, statusMessage: 'NOT_FOUND', message: 'テンプレートが見つかりません' })
    }

    await db.delete(taskTemplate).where(eq(taskTemplate.id, templateId))

    return { success: true }
  } catch (err) {
    handleApiError(err)
  }
})
