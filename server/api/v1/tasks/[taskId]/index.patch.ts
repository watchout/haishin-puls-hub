// EVT-010-014 §5.3: タスク更新 API
// PATCH /api/v1/tasks/:taskId
import { eq, and } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { updateTaskSchema, isValidTaskStatusTransition, calculateDueAt } from '~/server/utils/task-validation'
import { task, event } from '~/server/database/schema'
import type { TaskStatus } from '~/server/utils/task-validation'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'update', 'task')
    const taskId = getRouterParam(h3Event, 'taskId')

    if (!taskId) {
      throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR', message: 'タスクIDが指定されていません' })
    }

    const body = await readBody(h3Event)
    const parsed = updateTaskSchema.safeParse(body)
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: 'バリデーションエラー',
        data: { code: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors },
      })
    }

    const data = parsed.data

    // 存在確認 + テナント分離
    const existing = await db.select()
      .from(task)
      .where(and(eq(task.id, taskId), eq(task.tenantId, ctx.tenantId)))
      .limit(1)

    if (existing.length === 0) {
      throw createError({ statusCode: 404, statusMessage: 'NOT_FOUND', message: 'タスクが見つかりません' })
    }

    const current = existing[0]!

    // ステータス遷移チェック
    if (data.status && data.status !== current.status) {
      if (!isValidTaskStatusTransition(current.status as TaskStatus, data.status as TaskStatus)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'VALIDATION_ERROR',
          message: `ステータスを ${current.status} から ${data.status} に変更できません`,
        })
      }
    }

    // フィールドマッピング
    const updatePayload: Record<string, unknown> = { updatedAt: new Date() }

    if (data.title !== undefined) updatePayload.title = data.title
    if (data.description !== undefined) updatePayload.description = data.description
    if (data.assigned_role !== undefined) updatePayload.assignedRole = data.assigned_role
    if (data.assigned_user_id !== undefined) updatePayload.assignedUserId = data.assigned_user_id
    if (data.priority !== undefined) updatePayload.priority = data.priority
    if (data.sort_order !== undefined) updatePayload.sortOrder = data.sort_order

    // ステータス更新 + completedAt 自動設定
    if (data.status !== undefined) {
      updatePayload.status = data.status
      if (data.status === 'completed') {
        updatePayload.completedAt = new Date()
      } else if (data.status === 'pending') {
        updatePayload.completedAt = null
      }
    }

    // 相対日変更時の dueAt 再計算
    if (data.relative_day !== undefined) {
      updatePayload.relativeDay = data.relative_day
      // イベントの開催日を取得して再計算
      const eventRecord = await db.select({ startAt: event.startAt })
        .from(event)
        .where(eq(event.id, current.eventId))
        .limit(1)

      if (eventRecord[0]?.startAt) {
        updatePayload.dueAt = calculateDueAt(eventRecord[0].startAt, data.relative_day)
      }
    } else if (data.due_at !== undefined) {
      updatePayload.dueAt = new Date(data.due_at)
      updatePayload.relativeDay = null // 手動設定時は相対日をクリア
    }

    const result = await db.update(task)
      .set(updatePayload as never)
      .where(eq(task.id, taskId))
      .returning()

    return { task: result[0] }
  } catch (err) {
    handleApiError(err)
  }
})
