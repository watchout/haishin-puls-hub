// EVT-001-005 §5: POST /api/v1/events/ai/suggest - AI提案生成
// STEP 1 → STEP 2 遷移時に呼ばれる
// 会場候補・開催形式・概算見積りを一括生成

import { eq, and, or, isNull } from 'drizzle-orm'
import { ulid } from 'ulid'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { aiSuggestSchema } from '~/server/utils/event-validation'
import { venue, streamingPackage, estimate } from '~/server/database/schema'

// ──────────────────────────────────────
// 型定義
// ──────────────────────────────────────

interface VenueSuggestion {
  venue_id: string
  name: string
  branch_name: string | null
  address: string
  capacity: number
  reason: string
  availability: boolean
  equipment_match: boolean
}

interface FormatSuggestion {
  recommended: 'onsite' | 'online' | 'hybrid'
  reason: string
}

interface EstimateItem {
  category: string
  name: string
  quantity: number
  unit_price: number
  subtotal: number
  note?: string
}

// ──────────────────────────────────────
// 形式提案ロジック (BR-EVT-002)
// ──────────────────────────────────────

function suggestFormat(params: {
  capacityOnsite?: number
  capacityOnline?: number
  eventType: string
  targetAudience: string
}): FormatSuggestion {
  const { capacityOnsite = 0, capacityOnline = 0, eventType, targetAudience } = params

  // オンライン参加者がいる場合はハイブリッド推奨
  if (capacityOnsite > 0 && capacityOnline > 0) {
    return {
      recommended: 'hybrid',
      reason: `現地${capacityOnsite}名・オンライン${capacityOnline}名の参加を想定しているため、ハイブリッド形式を推奨します。${targetAudience}が遠方からも参加しやすくなります。`,
    }
  }

  // オンラインのみ
  if (capacityOnline > 0 && capacityOnsite === 0) {
    return {
      recommended: 'online',
      reason: 'オンライン参加者のみのため、オンライン形式を推奨します。会場費を削減できます。',
    }
  }

  // 社内イベントは現地推奨
  if (eventType === 'internal') {
    return {
      recommended: 'onsite',
      reason: '社内イベントのため、対面でのコミュニケーションを重視し現地開催を推奨します。',
    }
  }

  // デフォルト: 現地
  return {
    recommended: 'onsite',
    reason: `現地${capacityOnsite}名の参加を想定しています。対面での交流を重視した現地開催を推奨します。`,
  }
}

// ──────────────────────────────────────
// メインハンドラー
// ──────────────────────────────────────

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'create', 'event')
    const body = await readBody(h3Event)

    // バリデーション
    const parsed = aiSuggestSchema.safeParse(body)
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

    // ──────────────────────────────────────
    // 1. 会場候補検索 (BR-EVT-002)
    // ──────────────────────────────────────

    const requiredCapacity = Math.max(data.capacity_onsite ?? 0, 1)
    const needsStreaming = data.capacity_online != null && data.capacity_online > 0

    const venues = await db.select()
      .from(venue)
      .where(and(
        eq(venue.tenantId, ctx.tenantId),
        eq(venue.isActive, true),
      ))
      .limit(10)

    // 会場をスコアリングして上位3-5件を返す
    const scoredVenues: Array<VenueSuggestion & { score: number }> = venues
      .filter(v => (v.capacity ?? 0) >= requiredCapacity)
      .map((v) => {
        let score = 50
        const equipment = (v.equipment as Record<string, unknown>) ?? {}

        // キャパシティ適合度（ちょうど良いサイズが高スコア）
        const capacityRatio = requiredCapacity / (v.capacity ?? 0)
        if (capacityRatio >= 0.5 && capacityRatio <= 0.9) score += 30
        else if (capacityRatio >= 0.3) score += 15

        // 配信設備チェック
        const hasStreamingEquipment = Boolean(
          equipment.projector || equipment.screen || equipment.camera,
        )
        if (needsStreaming && hasStreamingEquipment) score += 20
        if (needsStreaming && !hasStreamingEquipment) score -= 10

        return {
          venue_id: v.id,
          name: v.name,
          branch_name: v.branchName,
          address: v.address ?? '',
          capacity: v.capacity ?? 0,
          reason: generateVenueReason({ name: v.name, capacity: v.capacity ?? 0, equipment: v.equipment }, requiredCapacity, needsStreaming),
          availability: true, // MVP: 常に空きあり（外部カレンダー未連携）
          equipment_match: needsStreaming ? hasStreamingEquipment : true,
          score,
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    const venueSuggestions: VenueSuggestion[] = scoredVenues.map(({ score: _s, ...rest }) => rest)

    // ──────────────────────────────────────
    // 2. 形式提案 (BR-EVT-002)
    // ──────────────────────────────────────

    const formatSuggestion = suggestFormat({
      capacityOnsite: data.capacity_onsite,
      capacityOnline: data.capacity_online,
      eventType: data.event_type,
      targetAudience: data.target_audience,
    })

    // ──────────────────────────────────────
    // 3. 概算見積り生成 (BR-EVT-003)
    // ──────────────────────────────────────

    const estimateItems: EstimateItem[] = []
    const selectedVenue = scoredVenues[0]

    // 会場費
    if (selectedVenue && formatSuggestion.recommended !== 'online') {
      estimateItems.push({
        category: 'venue',
        name: `${selectedVenue.name} 利用料`,
        quantity: 1,
        unit_price: 50000, // MVP: 固定料金（BR-EVT-003）
        subtotal: 50000,
      })
    }

    // 配信パッケージ費
    if (formatSuggestion.recommended === 'hybrid' || formatSuggestion.recommended === 'online') {
      const packages = await db.select()
        .from(streamingPackage)
        .where(and(
          or(
            eq(streamingPackage.tenantId, ctx.tenantId),
            isNull(streamingPackage.tenantId),
          ),
          eq(streamingPackage.isActive, true),
        ))
        .limit(3)

      // デフォルト: 最初のパッケージ
      const pkg = packages[0]
      if (pkg) {
        estimateItems.push({
          category: 'streaming',
          name: pkg.name,
          quantity: 1,
          unit_price: pkg.basePrice,
          subtotal: pkg.basePrice,
        })
      } else {
        // パッケージが未登録の場合はデフォルト料金
        estimateItems.push({
          category: 'streaming',
          name: '基本配信パッケージ',
          quantity: 1,
          unit_price: 80000,
          subtotal: 80000,
        })
      }
    }

    const totalAmount = estimateItems.reduce((sum, item) => sum + item.subtotal, 0)

    // 見積りをDBに保存
    const estimateResult = await db.insert(estimate)
      .values({
        id: ulid(),
        tenantId: ctx.tenantId,
        title: `概算見積り（AI生成）`,
        items: estimateItems,
        totalAmount,
        status: 'draft',
        generatedBy: 'ai',
        createdBy: ctx.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never)
      .returning()

    // ──────────────────────────────────────
    // 4. タイトル案・概要案生成
    // ──────────────────────────────────────

    const suggestedTitle = generateTitle(data.event_type, data.goal)
    const suggestedDescription = `${data.goal}\n\n対象: ${data.target_audience}`

    return {
      venues: venueSuggestions,
      format: formatSuggestion,
      estimate: {
        id: estimateResult[0]?.id,
        title: estimateResult[0]?.title,
        items: estimateItems,
        total_amount: totalAmount,
      },
      suggested_title: suggestedTitle,
      suggested_description: suggestedDescription,
    }
  } catch (err) {
    handleApiError(err)
  }
})

// ──────────────────────────────────────
// ヘルパー関数
// ──────────────────────────────────────

function generateVenueReason(
  v: { name: string; capacity: number; equipment: unknown },
  requiredCapacity: number,
  needsStreaming: boolean,
): string {
  const parts: string[] = []
  parts.push(`収容人数${v.capacity}名で${requiredCapacity}名の参加に対応可能`)

  const equipment = (v.equipment as Record<string, unknown>) ?? {}
  if (needsStreaming && equipment.projector) {
    parts.push('配信設備完備')
  }

  return parts.join('・')
}

function generateTitle(eventType: string, goal: string): string {
  const typeLabels: Record<string, string> = {
    seminar: 'セミナー',
    presentation: 'プレゼンテーション',
    internal: '社内イベント',
    workshop: 'ワークショップ',
  }

  const typeLabel = typeLabels[eventType] ?? 'イベント'
  // 目的から簡潔なタイトルを生成
  const shortGoal = goal.length > 30 ? `${goal.substring(0, 30)}...` : goal
  return `${shortGoal} ${typeLabel}`
}
