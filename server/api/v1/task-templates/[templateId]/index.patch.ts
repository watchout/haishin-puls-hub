// EVT-010-014 §5.9: タスクテンプレート更新 API
// PATCH /api/v1/task-templates/:templateId
import { eq, and } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { updateTaskTemplateSchema } from '~/server/utils/task-validation'
import { taskTemplate } from '~/server/database/schema'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'update', 'task')
    const templateId = getRouterParam(h3Event, 'templateId')

    if (!templateId) {
      throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR', message: 'テンプレートIDが指定されていません' })
    }

    const body = await readBody(h3Event)
    const parsed = updateTaskTemplateSchema.safeParse(body)
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: 'バリデーションエラー',
        data: { code: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors },
      })
    }

    // 存在確認（自テナントのみ更新可能）
    const existing = await db.select()
      .from(taskTemplate)
      .where(and(
        eq(taskTemplate.id, templateId),
        eq(taskTemplate.tenantId, ctx.tenantId),
      ))
      .limit(1)

    if (existing.length === 0) {
      throw createError({ statusCode: 404, statusMessage: 'NOT_FOUND', message: 'テンプレートが見つかりません' })
    }

    const data = parsed.data
    const updatePayload: Record<string, unknown> = { updatedAt: new Date() }

    if (data.event_type !== undefined) updatePayload.eventType = data.event_type
    if (data.title !== undefined) updatePayload.title = data.title
    if (data.description !== undefined) updatePayload.description = data.description
    if (data.assigned_role !== undefined) updatePayload.assignedRole = data.assigned_role
    if (data.relative_day !== undefined) updatePayload.relativeDay = data.relative_day
    if (data.priority !== undefined) updatePayload.priority = data.priority
    if (data.sort_order !== undefined) updatePayload.sortOrder = data.sort_order
    if (data.is_active !== undefined) updatePayload.isActive = data.is_active

    const result = await db.update(taskTemplate)
      .set(updatePayload as never)
      .where(eq(taskTemplate.id, templateId))
      .returning()

    return { template: result[0] }
  } catch (err) {
    handleApiError(err)
  }
})
