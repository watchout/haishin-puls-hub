// EVT-040 §5: レポートPDFエクスポート
// GET /api/v1/reports/:id/export/pdf
// MVP: PDFエクスポートはスタブ（Puppeteer/Playwright依存のため）
import { eq, and } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { eventReport } from '~/server/database/schema/report'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'

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

    // レポート存在確認
    const reports = await db.select({
      id: eventReport.id,
      content: eventReport.content,
    })
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

    // MVP: Puppeteer/Playwright 未導入のため、Markdown テキストをそのまま返す
    // TODO: PDF生成エンジン導入後に実装（OPEN-040-02）
    throw createError({
      statusCode: 501,
      statusMessage: 'NOT_IMPLEMENTED',
      message: 'PDF生成機能は準備中です。Markdown形式でレポートを閲覧してください。',
    })
  } catch (err) {
    handleApiError(err)
  }
})
