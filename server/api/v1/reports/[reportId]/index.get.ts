// EVT-040 §5: レポート詳細取得
// GET /api/v1/reports/:id
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

    const report = reports[0]!

    return {
      id: report.id,
      eventId: report.eventId,
      tenantId: report.tenantId,
      reportType: report.reportType,
      content: report.content,
      metadata: report.metadata,
      generatedBy: report.generatedBy,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    }
  } catch (err) {
    handleApiError(err)
  }
})
