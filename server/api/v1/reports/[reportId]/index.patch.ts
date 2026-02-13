// EVT-040 §5: レポート編集
// PATCH /api/v1/reports/:id
import { eq, and } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { eventReport } from '~/server/database/schema/report'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import {
  updateReportSchema,
  canEditReport,
  isValidStatusTransition,
} from '~/server/utils/report-validation'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'read', 'event')
    const reportId = getRouterParam(h3Event, 'reportId')

    if (!reportId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: 'レポートIDが指定されていません',
      })
    }

    // ロールベースの編集権限チェック
    if (!canEditReport(ctx.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'FORBIDDEN',
        message: 'この操作を実行する権限がありません',
      })
    }

    // リクエストバリデーション
    const body = await readBody(h3Event)
    const parsed = updateReportSchema.safeParse(body)
    if (!parsed.success) {
      throw parsed.error
    }

    // 既存レポート取得
    const reports = await db.select()
      .from(eventReport)
      .where(
        and(
          eq(eventReport.id, reportId),
          eq(eventReport.tenantId, ctx.tenantId),
        ),
      )
      .limit(1)

    if (reports.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'NOT_FOUND',
        message: '指定されたレポートが見つかりません',
      })
    }

    const existing = reports[0]!

    // BR-040-04: 公開済みレポートの編集禁止
    if (existing.status === 'published' && parsed.data.content !== undefined) {
      throw createError({
        statusCode: 403,
        statusMessage: 'FORBIDDEN',
        message: '公開済みのレポートは編集できません',
      })
    }

    // ステータス遷移バリデーション（BR-040-04）
    if (parsed.data.status && parsed.data.status !== existing.status) {
      if (!isValidStatusTransition(existing.status, parsed.data.status)) {
        throw createError({
          statusCode: 403,
          statusMessage: 'FORBIDDEN',
          message: '公開済みのレポートは編集できません',
        })
      }
    }

    // 更新データ構築
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (parsed.data.content !== undefined) {
      updateData.content = parsed.data.content
    }
    if (parsed.data.status !== undefined) {
      updateData.status = parsed.data.status
    }
    if (parsed.data.metadata !== undefined) {
      updateData.metadata = parsed.data.metadata
    }

    await db.update(eventReport)
      .set(updateData)
      .where(eq(eventReport.id, reportId))

    // 更新後のレポートを返す
    const updated = await db.select()
      .from(eventReport)
      .where(eq(eventReport.id, reportId))
      .limit(1)

    const report = updated[0]!

    return {
      id: report.id,
      content: report.content,
      status: report.status,
      updatedAt: report.updatedAt.toISOString(),
    }
  } catch (err) {
    handleApiError(err)
  }
})
