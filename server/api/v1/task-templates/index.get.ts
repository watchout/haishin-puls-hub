// EVT-010-014 §5.7: タスクテンプレート一覧取得 API
// GET /api/v1/task-templates
import { eq, and, or, isNull } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { taskTemplate } from '~/server/database/schema'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'read', 'task')
    const query = getQuery(h3Event)

    const conditions = [
      or(
        eq(taskTemplate.tenantId, ctx.tenantId),
        isNull(taskTemplate.tenantId),
      ),
    ]

    if (query.event_type && typeof query.event_type === 'string') {
      conditions.push(eq(taskTemplate.eventType, query.event_type))
    }

    if (query.is_active !== undefined) {
      const isActive = query.is_active === 'true' || query.is_active === true
      conditions.push(eq(taskTemplate.isActive, isActive as boolean))
    }

    const templates = await db.select()
      .from(taskTemplate)
      .where(and(...conditions))
      .orderBy(taskTemplate.eventType, taskTemplate.sortOrder)

    return { templates }
  } catch (err) {
    handleApiError(err)
  }
})
