// EVT-001-005 §5: DELETE /api/v1/events/:id - イベント削除（論理削除）
// organizer, event_planner のみ
// §3-G #7: draft 以外での削除は拒否

import { eq, and } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { event } from '~/server/database/schema'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'delete', 'event')
    const id = getRouterParam(h3Event, 'id')

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: 'IDが指定されていません',
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

    // §3-G #7: draft 以外は削除不可
    if (existing[0]!.status !== 'draft') {
      throw createError({
        statusCode: 400,
        statusMessage: 'INVALID_STATUS',
        message: '下書き状態のイベントのみ削除できます',
        data: {
          code: 'INVALID_STATUS',
          current_status: existing[0]!.status,
        },
      })
    }

    // 論理削除: status を cancelled に変更し updatedAt を更新
    const result = await db.update(event)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      } as never)
      .where(eq(event.id, id))
      .returning()

    return { data: result[0], message: 'イベントを削除しました' }
  } catch (err) {
    handleApiError(err)
  }
})
