// EVT-010-014 §5.2: タスク作成 API
// POST /api/v1/events/:eventId/tasks
import { eq, and, sql } from 'drizzle-orm'
import { ulid } from 'ulid'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { createTaskSchema, calculateDueAt, MAX_TASKS_PER_EVENT } from '~/server/utils/task-validation'
import { task, event } from '~/server/database/schema'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'create', 'task')
    const eventId = getRouterParam(h3Event, 'eventId')

    if (!eventId) {
      throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR', message: 'イベントIDが指定されていません' })
    }

    const body = await readBody(h3Event)

    // Zod バリデーション
    const parsed = createTaskSchema.safeParse(body)
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: 'バリデーションエラー',
        data: { code: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors },
      })
    }

    const data = parsed.data

    // イベント存在確認 + テナント分離
    const eventRecord = await db.select()
      .from(event)
      .where(and(eq(event.id, eventId), eq(event.tenantId, ctx.tenantId)))
      .limit(1)

    if (eventRecord.length === 0) {
      throw createError({ statusCode: 404, statusMessage: 'NOT_FOUND', message: 'イベントが見つかりません' })
    }

    // §3-F: 1イベントあたりタスク数上限チェック
    const countResult = await db.select({ count: sql<number>`count(*)::int` })
      .from(task)
      .where(eq(task.eventId, eventId))

    if ((countResult[0]?.count ?? 0) >= MAX_TASKS_PER_EVENT) {
      throw createError({
        statusCode: 409,
        statusMessage: 'SCHEDULE_CONFLICT',
        message: `タスク数が上限(${MAX_TASKS_PER_EVENT}件)に達しています`,
      })
    }

    // 締め切り計算
    let dueAt: Date | null = null
    if (data.relative_day !== undefined && eventRecord[0].startAt) {
      dueAt = calculateDueAt(eventRecord[0].startAt, data.relative_day)
    } else if (data.due_at) {
      dueAt = new Date(data.due_at)
    }

    const result = await db.insert(task)
      .values({
        id: ulid(),
        eventId,
        tenantId: ctx.tenantId,
        title: data.title,
        description: data.description ?? null,
        assignedRole: data.assigned_role ?? null,
        assignedUserId: data.assigned_user_id ?? null,
        status: 'pending',
        priority: data.priority ?? 'medium',
        relativeDay: data.relative_day ?? null,
        dueAt,
        completedAt: null,
        sortOrder: data.sort_order ?? 0,
        templateId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never)
      .returning()

    setResponseStatus(h3Event, 201)
    return { task: result[0] }
  } catch (err) {
    handleApiError(err)
  }
})
