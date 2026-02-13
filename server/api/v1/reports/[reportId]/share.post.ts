// EVT-040 §5: レポートメール共有
// POST /api/v1/reports/:id/share
import { eq, and } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { eventReport } from '~/server/database/schema/report'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { shareReportSchema, canEditReport } from '~/server/utils/report-validation'

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

    // ロールベースの共有権限チェック
    if (!canEditReport(ctx.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'FORBIDDEN',
        message: 'この操作を実行する権限がありません',
      })
    }

    // リクエストバリデーション
    const body = await readBody(h3Event)
    const parsed = shareReportSchema.safeParse(body)
    if (!parsed.success) {
      throw parsed.error
    }

    // レポート存在確認
    const reports = await db.select({ id: eventReport.id, status: eventReport.status })
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

    // MVP: メール送信はスタブ（メール基盤未構築）
    // TODO: メール基盤完成後に実際の送信処理を実装
    const { to, attachPdf } = parsed.data

    return {
      success: true,
      sentTo: to,
      attachPdf,
      message: 'メール送信機能は準備中です。',
    }
  } catch (err) {
    handleApiError(err)
  }
})
