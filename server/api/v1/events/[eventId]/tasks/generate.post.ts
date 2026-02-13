// EVT-010-014 §5.6: タスクテンプレート自動生成 API
// POST /api/v1/events/:eventId/tasks/generate
import { eq, and, or, isNull } from 'drizzle-orm'
import { ulid } from 'ulid'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { generateTasksSchema, calculateDueAt } from '~/server/utils/task-validation'
import { task, event, taskTemplate } from '~/server/database/schema'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'create', 'task')
    const eventId = getRouterParam(h3Event, 'eventId')

    if (!eventId) {
      throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR', message: 'イベントIDが指定されていません' })
    }

    const body = await readBody(h3Event)
    const parsed = generateTasksSchema.safeParse(body ?? {})
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: 'バリデーションエラー',
        data: { code: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors },
      })
    }

    const data = parsed.data

    // イベント存在確認
    const eventRecord = await db.select()
      .from(event)
      .where(and(eq(event.id, eventId), eq(event.tenantId, ctx.tenantId)))
      .limit(1)

    if (eventRecord.length === 0) {
      throw createError({ statusCode: 404, statusMessage: 'NOT_FOUND', message: 'イベントが見つかりません' })
    }

    const evt = eventRecord[0]!

    // overwrite=true の場合は既存タスクを削除
    if (data.overwrite) {
      await db.delete(task).where(eq(task.eventId, eventId))
    }

    const generatedTasks: typeof task.$inferInsert[] = []
    let fromTemplate = 0
    let fromAI = 0

    if (data.use_template) {
      // §5.6 ビジネスルール: テナント独自テンプレートを優先
      const templates = await db.select()
        .from(taskTemplate)
        .where(and(
          eq(taskTemplate.eventType, evt.eventType),
          eq(taskTemplate.isActive, true),
          or(
            eq(taskTemplate.tenantId, ctx.tenantId),
            isNull(taskTemplate.tenantId),
          ),
        ))
        .orderBy(taskTemplate.sortOrder)

      // テナント独自があればそちらを優先
      const tenantTemplates = templates.filter(t => t.tenantId === ctx.tenantId)
      const systemTemplates = templates.filter(t => t.tenantId === null)
      const selectedTemplates = tenantTemplates.length > 0 ? tenantTemplates : systemTemplates

      for (const tmpl of selectedTemplates) {
        const dueAt = evt.startAt ? calculateDueAt(evt.startAt, tmpl.relativeDay) : null

        generatedTasks.push({
          id: ulid(),
          eventId,
          tenantId: ctx.tenantId,
          title: tmpl.title,
          description: tmpl.description,
          assignedRole: tmpl.assignedRole,
          assignedUserId: null,
          status: 'pending',
          priority: tmpl.priority,
          relativeDay: tmpl.relativeDay,
          dueAt,
          completedAt: null,
          sortOrder: tmpl.sortOrder,
          templateId: tmpl.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as never)
      }
      fromTemplate = generatedTasks.length
    }

    // テンプレートがない場合のフォールバック: デフォルトタスクセットを生成
    if (generatedTasks.length === 0) {
      const defaultTasks = [
        { title: '企画書作成', assignedRole: 'organizer', relativeDay: -30, priority: 'high' as const, sortOrder: 1 },
        { title: '会場レイアウト確認', assignedRole: 'venue', relativeDay: -14, priority: 'medium' as const, sortOrder: 2 },
        { title: '配信機材手配', assignedRole: 'streaming', relativeDay: -14, priority: 'medium' as const, sortOrder: 3 },
        { title: '参加者募集開始', assignedRole: 'organizer', relativeDay: -21, priority: 'high' as const, sortOrder: 4 },
        { title: 'リハーサル', assignedRole: 'organizer', relativeDay: -1, priority: 'high' as const, sortOrder: 5 },
        { title: '当日運営', assignedRole: 'organizer', relativeDay: 0, priority: 'high' as const, sortOrder: 6 },
        { title: '振り返りレポート作成', assignedRole: 'organizer', relativeDay: 1, priority: 'medium' as const, sortOrder: 7 },
      ]

      for (const dt of defaultTasks) {
        const dueAt = evt.startAt ? calculateDueAt(evt.startAt, dt.relativeDay) : null
        generatedTasks.push({
          id: ulid(),
          eventId,
          tenantId: ctx.tenantId,
          title: dt.title,
          description: null,
          assignedRole: dt.assignedRole,
          assignedUserId: null,
          status: 'pending',
          priority: dt.priority,
          relativeDay: dt.relativeDay,
          dueAt,
          completedAt: null,
          sortOrder: dt.sortOrder,
          templateId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as never)
      }
      fromAI = generatedTasks.length
    }

    // バルクインサート
    let insertedTasks: unknown[] = []
    if (generatedTasks.length > 0) {
      insertedTasks = await db.insert(task)
        .values(generatedTasks as never[])
        .returning()
    }

    setResponseStatus(h3Event, 201)
    return {
      tasks: insertedTasks,
      summary: {
        generated: insertedTasks.length,
        fromTemplate,
        fromAI,
      },
    }
  } catch (err) {
    handleApiError(err)
  }
})
