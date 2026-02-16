// EVT-005 §5: POST /api/v1/ai/generate/proposal - 企画書ドラフト生成
// organizer, event_planner
// イベント情報から5セクション構成の企画書を生成

import { eq, and } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { generateProposalSchema } from '~/server/utils/event-validation'
import { event, estimate, venue } from '~/server/database/schema'

// ──────────────────────────────────────
// 型定義
// ──────────────────────────────────────

interface ProposalSection {
  heading: string
  content: string
}

// ──────────────────────────────────────
// ラベル定義
// ──────────────────────────────────────

const EVENT_TYPE_LABELS: Record<string, string> = {
  seminar: 'セミナー',
  presentation: 'プレゼンテーション',
  internal: '社内イベント',
  workshop: 'ワークショップ',
}

const FORMAT_LABELS: Record<string, string> = {
  onsite: '現地開催',
  online: 'オンライン開催',
  hybrid: 'ハイブリッド開催',
}

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'create', 'event')
    const body = await readBody(h3Event)

    // バリデーション
    const parsed = generateProposalSchema.safeParse(body)
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? 'バリデーションエラー',
        data: {
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        },
      })
    }

    const data = parsed.data

    // イベント取得
    const eventResult = await db.select()
      .from(event)
      .where(and(
        eq(event.id, data.event_id),
        eq(event.tenantId, ctx.tenantId),
      ))
      .limit(1)

    if (eventResult.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'NOT_FOUND',
        message: '指定されたイベントが見つかりません',
      })
    }

    const evt = eventResult[0]!

    // 会場情報取得（存在する場合）
    let venueName = '未定'
    let venueAddress = ''
    if (evt.venueId) {
      const venueResult = await db.select()
        .from(venue)
        .where(eq(venue.id, evt.venueId))
        .limit(1)

      if (venueResult.length > 0) {
        venueName = venueResult[0]!.name
        venueAddress = venueResult[0]!.address ?? ''
      }
    }

    // 見積り情報取得（含める場合）
    let estimateItems: Array<{ category: string; name: string; subtotal: number }> = []
    let estimateTotal = 0
    if (data.include_estimate) {
      const estimateResult = await db.select()
        .from(estimate)
        .where(and(
          eq(estimate.eventId, data.event_id),
          eq(estimate.tenantId, ctx.tenantId),
        ))
        .limit(1)

      if (estimateResult.length > 0) {
        const est = estimateResult[0]!
        estimateItems = (est.items as Array<{ category: string; name: string; subtotal: number }>) ?? []
        estimateTotal = est.totalAmount
      }
    }

    // ──────────────────────────────────────
    // 企画書セクション生成 (BR-EVT-004)
    // ──────────────────────────────────────

    const sections: ProposalSection[] = []
    const typeLabel = EVENT_TYPE_LABELS[evt.eventType] ?? evt.eventType
    const formatLabel = FORMAT_LABELS[evt.format] ?? evt.format

    // 1. イベント概要
    sections.push({
      heading: '1. イベント概要',
      content: [
        `## 目的`,
        evt.goal ?? '（未設定）',
        '',
        `## ターゲット`,
        evt.targetAudience ?? '（未設定）',
        '',
        `## 期待効果`,
        `- ${typeLabel}を通じた情報発信と参加者エンゲージメント向上`,
        `- ターゲット層への直接的なリーチとフィードバック収集`,
      ].join('\n'),
    })

    // 2. 開催概要
    const startStr = evt.startAt
      ? evt.startAt.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
      : '未定'
    const timeStr = evt.startAt && evt.endAt
      ? `${evt.startAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} - ${evt.endAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`
      : '未定'

    const capacityParts: string[] = []
    if (evt.capacityOnsite) capacityParts.push(`現地${evt.capacityOnsite}名`)
    if (evt.capacityOnline) capacityParts.push(`オンライン${evt.capacityOnline}名`)
    const capacityStr = capacityParts.length > 0 ? capacityParts.join(' / ') : '未定'

    sections.push({
      heading: '2. 開催概要',
      content: [
        `| 項目 | 内容 |`,
        `|------|------|`,
        `| 種別 | ${typeLabel} |`,
        `| 形式 | ${formatLabel} |`,
        `| 日時 | ${startStr} ${timeStr} |`,
        `| 会場 | ${venueName}${venueAddress ? ` (${venueAddress})` : ''} |`,
        `| 定員 | ${capacityStr} |`,
      ].join('\n'),
    })

    // 3. 概算予算
    if (data.include_estimate && estimateItems.length > 0) {
      const budgetLines = [
        `| カテゴリ | 項目 | 金額 |`,
        `|---------|------|------|`,
      ]
      for (const item of estimateItems) {
        budgetLines.push(`| ${item.category} | ${item.name} | ¥${estimateTotal.toLocaleString()} |`)
      }
      budgetLines.push(`| **合計** | | **¥${estimateTotal.toLocaleString()}** |`)

      sections.push({
        heading: '3. 概算予算',
        content: budgetLines.join('\n'),
      })
    } else {
      const budgetStr = evt.budgetMin != null && evt.budgetMax != null
        ? `¥${evt.budgetMin.toLocaleString()} 〜 ¥${evt.budgetMax.toLocaleString()}`
        : '未定'
      sections.push({
        heading: '3. 概算予算',
        content: `予算範囲: ${budgetStr}`,
      })
    }

    // 4. スケジュール
    const milestones: string[] = []
    if (evt.startAt) {
      const startDate = evt.startAt
      const d30 = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000)
      const d14 = new Date(startDate.getTime() - 14 * 24 * 60 * 60 * 1000)
      const d7 = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000)
      const d1 = new Date(startDate.getTime() - 1 * 24 * 60 * 60 * 1000)

      const fmt = (d: Date) => d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })

      milestones.push(`| ${fmt(d30)} | 企画確定・会場予約 |`)
      milestones.push(`| ${fmt(d14)} | 登壇者確定・告知開始 |`)
      milestones.push(`| ${fmt(d7)} | 参加者受付締切・最終確認 |`)
      milestones.push(`| ${fmt(d1)} | リハーサル・機材チェック |`)
      milestones.push(`| ${fmt(startDate)} | **本番当日** |`)
    }

    sections.push({
      heading: '4. スケジュール',
      content: milestones.length > 0
        ? ['| 日程 | マイルストーン |', '|------|-------------|', ...milestones].join('\n')
        : '日程未定のため、スケジュールは確定次第更新します。',
    })

    // 5. リスクと対策
    const risks: string[] = [
      `| 参加者数が想定を下回る | 早期の告知開始、リマインダー送付 |`,
      `| 会場の技術トラブル | 事前リハーサルの実施、バックアップ機材の準備 |`,
    ]
    if (evt.format === 'hybrid' || evt.format === 'online') {
      risks.push(`| 配信トラブル | 配信テスト実施、テクニカルサポート常駐 |`)
      risks.push(`| ネットワーク障害 | 有線LAN確保、モバイル回線バックアップ |`)
    }

    sections.push({
      heading: '5. リスクと対策',
      content: ['| リスク | 対策 |', '|--------|------|', ...risks].join('\n'),
    })

    // ──────────────────────────────────────
    // マークダウン生成
    // ──────────────────────────────────────

    const markdown = [
      `# イベント企画書`,
      '',
      `## ${evt.title}`,
      '',
      '---',
      '',
      ...sections.flatMap(s => [s.heading, '', s.content, '', '---', '']),
    ].join('\n')

    return {
      title: evt.title,
      sections,
      markdown,
    }
  } catch (err) {
    handleApiError(err)
  }
})
