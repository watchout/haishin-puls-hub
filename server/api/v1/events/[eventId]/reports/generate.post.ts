// EVT-040 §5: AI によるレポート生成
// POST /api/v1/events/:eid/reports/generate
import { eq, and } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { event } from '~/server/database/schema/event'
import { eventReport } from '~/server/database/schema/report'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { generateReportSchema, canGenerateReport } from '~/server/utils/report-validation'
import { createEventReport } from '~/server/utils/report-generator'

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

    // ロールベースの生成権限チェック（§1 対象ロール: organizer, sales_marketing, venue のみ生成可）
    if (!canGenerateReport(ctx.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'FORBIDDEN',
        message: 'この操作を実行する権限がありません',
      })
    }

    // リクエストボディのバリデーション
    const body = await readBody(h3Event)
    const parsed = generateReportSchema.safeParse(body ?? {})
    if (!parsed.success) {
      throw parsed.error
    }

    const { reportType } = parsed.data

    // イベント存在確認 + ステータスチェック（BR-040-01: completed のみ生成可能）
    const eventRows = await db.select({
      id: event.id,
      status: event.status,
    })
      .from(event)
      .where(
        and(
          eq(event.id, eventId),
          eq(event.tenantId, ctx.tenantId),
        ),
      )
      .limit(1)

    if (eventRows.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'NOT_FOUND',
        message: '指定されたイベントが見つかりません',
      })
    }

    const eventData = eventRows[0]!

    if (eventData.status !== 'completed') {
      throw createError({
        statusCode: 400,
        statusMessage: 'EVENT_NOT_COMPLETED',
        message: 'イベントが完了していないため、レポートを生成できません',
      })
    }

    // 重複チェック（BR-040-01: 自動生成は1イベントにつき1回）
    // 手動生成は複数可能だが、同タイプの自動生成は1回のみ
    const existingReports = await db.select({ id: eventReport.id })
      .from(eventReport)
      .where(
        and(
          eq(eventReport.eventId, eventId),
          eq(eventReport.tenantId, ctx.tenantId),
          eq(eventReport.reportType, reportType),
          eq(eventReport.generatedBy, 'ai'),
        ),
      )
      .limit(1)

    if (existingReports.length > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: 'REPORT_ALREADY_EXISTS',
        message: 'このイベントの自動生成レポートは既に存在します',
      })
    }

    // レポート生成（MVP: 同期実行）
    const result = await createEventReport(eventId, ctx.tenantId, reportType)

    setResponseStatus(h3Event, 201)
    return {
      id: result.id,
      eventId,
      reportType,
      status: 'draft',
      generatedBy: 'ai',
      message: 'レポート生成が完了しました。',
      createdAt: new Date().toISOString(),
    }
  } catch (err) {
    handleApiError(err)
  }
})
