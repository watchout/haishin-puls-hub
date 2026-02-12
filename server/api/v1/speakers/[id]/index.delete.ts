// EVT-020-021 §6.1: 登壇者削除 API
// DELETE /api/v1/speakers/:id
// CON-004: 物理削除（論理削除なし）
import { eq, and } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { speaker } from '~/server/database/schema'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'delete', 'speaker')
    const id = getRouterParam(h3Event, 'id')

    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'VALIDATION_ERROR', message: '登壇者IDが指定されていません' })
    }

    // 既存レコード取得 + テナント分離
    const [existing] = await db.select({ id: speaker.id })
      .from(speaker)
      .where(and(eq(speaker.id, id), eq(speaker.tenantId, ctx.tenantId)))
      .limit(1)

    if (!existing) {
      throw createError({ statusCode: 404, statusMessage: 'NOT_FOUND', message: '登壇者が見つかりません' })
    }

    // TODO: 関連ファイルの物理削除 (§8.5 FR-055)

    // 物理削除 (CON-004)
    await db.delete(speaker).where(eq(speaker.id, id))

    return { data: { deleted: true } }
  } catch (err) {
    handleApiError(err)
  }
})
