// EVT-040 §5: 会場向け「レポート＋次回提案」送信
// POST /api/v1/reports/:id/send-proposal
import { eq, and } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { eventReport } from '~/server/database/schema/report'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { sendProposalSchema, canSendProposal } from '~/server/utils/report-validation'

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

    // ロール権限チェック（§1: venue のみ次回提案送信可）
    if (!canSendProposal(ctx.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'FORBIDDEN',
        message: 'この操作を実行する権限がありません',
      })
    }

    // リクエストバリデーション
    const body = await readBody(h3Event)
    const parsed = sendProposalSchema.safeParse(body)
    if (!parsed.success) {
      throw parsed.error
    }

    // レポート存在確認
    const reports = await db.select({
      id: eventReport.id,
      content: eventReport.content,
      status: eventReport.status,
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

    // MVP: メール送信はスタブ
    // TODO: メール基盤完成後に実際の送信処理を実装
    const { to } = parsed.data

    return {
      success: true,
      sentTo: to,
      message: 'メール送信機能は準備中です。',
    }
  } catch (err) {
    handleApiError(err)
  }
})
