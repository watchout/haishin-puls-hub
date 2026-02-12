// EVT-010-014 §5.8: タスクテンプレート作成 API
// POST /api/v1/task-templates
import { ulid } from 'ulid'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { createTaskTemplateSchema } from '~/server/utils/task-validation'
import { taskTemplate } from '~/server/database/schema'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'create', 'task')
    const body = await readBody(h3Event)

    const parsed = createTaskTemplateSchema.safeParse(body)
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: 'バリデーションエラー',
        data: { code: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors },
      })
    }

    const data = parsed.data

    const result = await db.insert(taskTemplate)
      .values({
        id: ulid(),
        tenantId: ctx.tenantId,
        eventType: data.event_type,
        title: data.title,
        description: data.description ?? null,
        assignedRole: data.assigned_role,
        relativeDay: data.relative_day,
        priority: data.priority ?? 'medium',
        sortOrder: data.sort_order ?? 0,
        isActive: data.is_active ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never)
      .returning()

    setResponseStatus(h3Event, 201)
    return { template: result[0] }
  } catch (err) {
    handleApiError(err)
  }
})
