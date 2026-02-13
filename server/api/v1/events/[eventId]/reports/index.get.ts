// EVT-040 §5: イベントのレポート一覧取得
// GET /api/v1/events/:eid/reports
import { eq, and, desc } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { eventReport } from '~/server/database/schema/report'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'read', 'event')
    const eventId = getRouterParam(h3Event, 'eventId')

    if (!eventId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: 'イベントIDが指定されていません',
      })
    }

    const reports = await db.select({
      id: eventReport.id,
      eventId: eventReport.eventId,
      reportType: eventReport.reportType,
      status: eventReport.status,
      generatedBy: eventReport.generatedBy,
      metadata: eventReport.metadata,
      createdAt: eventReport.createdAt,
      updatedAt: eventReport.updatedAt,
    })
      .from(eventReport)
      .where(
        and(
          eq(eventReport.eventId, eventId),
          eq(eventReport.tenantId, ctx.tenantId),
        ),
      )
      .orderBy(desc(eventReport.createdAt))

    return {
      reports: reports.map(r => ({
        id: r.id,
        eventId: r.eventId,
        reportType: r.reportType,
        status: r.status,
        generatedBy: r.generatedBy,
        metadata: r.metadata,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    }
  } catch (err) {
    handleApiError(err)
  }
})
