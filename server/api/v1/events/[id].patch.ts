// EVT-001-005 §5: PATCH /api/v1/events/:id - イベント更新
// organizer, event_planner のみ
// BR-EVT-001: ステータス遷移ルール適用

import { eq, and } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { updateEventSchema, isValidStatusTransition } from '~/server/utils/event-validation'
import type { EventStatus } from '~/server/utils/event-validation'
import { event } from '~/server/database/schema'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'update', 'event')
    const id = getRouterParam(h3Event, 'id')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: 'IDが指定されていません',
      })
    }

    const body = await readBody(h3Event)

    // Zod バリデーション
    const parsed = updateEventSchema.safeParse(body)
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: 'バリデーションエラー',
        data: {
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        },
      })
    }

    // 既存データ取得
    const existing = await db.select()
      .from(event)
      .where(and(
        eq(event.id, id),
        eq(event.tenantId, ctx.tenantId),
      ))
      .limit(1)

    if (existing.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'NOT_FOUND',
        message: '指定されたイベントが見つかりません',
      })
    }

    const current = existing[0]!

    // BR-004: 楽観的ロック
    if (parsed.data.updated_at && current.updatedAt) {
      const clientTime = new Date(parsed.data.updated_at).getTime()
      const serverTime = current.updatedAt.getTime()
      if (clientTime !== serverTime) {
        throw createError({
          statusCode: 409,
          statusMessage: 'CONFLICT',
          message: 'このリソースは他のユーザーによって更新されています。最新のデータをリロードしてください。',
        })
      }
    }

    // BR-EVT-001: ステータス遷移チェック
    if (parsed.data.status && parsed.data.status !== current.status) {
      const from = current.status as EventStatus
      const to = parsed.data.status as EventStatus
      if (!isValidStatusTransition(from, to)) {
        throw createError({
          statusCode: 409,
          statusMessage: 'CONFLICT',
          message: '現在のステータスではこの操作を実行できません',
          data: {
            code: 'INVALID_STATUS_TRANSITION',
            current_status: from,
            requested_status: to,
          },
        })
      }
    }

    // 更新フィールド構築（undefinedは除外、nullは許可）
    const { updated_at: _removed, ...updateData } = parsed.data
    const updatePayload: Record<string, unknown> = { updatedAt: new Date() }

    if (updateData.title !== undefined) updatePayload.title = updateData.title
    if (updateData.description !== undefined) updatePayload.description = updateData.description
    if (updateData.event_type !== undefined) updatePayload.eventType = updateData.event_type
    if (updateData.format !== undefined) updatePayload.format = updateData.format
    if (updateData.status !== undefined) updatePayload.status = updateData.status
    if (updateData.goal !== undefined) updatePayload.goal = updateData.goal
    if (updateData.target_audience !== undefined) updatePayload.targetAudience = updateData.target_audience
    if (updateData.capacity_onsite !== undefined) updatePayload.capacityOnsite = updateData.capacity_onsite
    if (updateData.capacity_online !== undefined) updatePayload.capacityOnline = updateData.capacity_online
    if (updateData.budget_min !== undefined) updatePayload.budgetMin = updateData.budget_min
    if (updateData.budget_max !== undefined) updatePayload.budgetMax = updateData.budget_max
    if (updateData.date_candidates !== undefined) updatePayload.dateCandidates = updateData.date_candidates
    if (updateData.venue_id !== undefined) updatePayload.venueId = updateData.venue_id
    if (updateData.start_at !== undefined) updatePayload.startAt = updateData.start_at ? new Date(updateData.start_at) : null
    if (updateData.end_at !== undefined) updatePayload.endAt = updateData.end_at ? new Date(updateData.end_at) : null
    if (updateData.ai_suggestions !== undefined) updatePayload.aiSuggestions = updateData.ai_suggestions
    if (updateData.settings !== undefined) updatePayload.settings = updateData.settings

    const result = await db.update(event)
      .set(updatePayload as never)
      .where(eq(event.id, id))
      .returning()

    return { data: result[0] }
  } catch (err) {
    handleApiError(err)
  }
})
