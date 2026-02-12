// EVT-001-005 §5: POST /api/v1/estimates/generate - 見積り自動生成
// organizer, event_planner, venue_sales

import { eq, and, or, isNull } from 'drizzle-orm'
import { ulid } from 'ulid'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { generateEstimateSchema } from '~/server/utils/event-validation'
import { venue, streamingPackage, estimate, event } from '~/server/database/schema'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'create', 'event')
    const body = await readBody(h3Event)

    // バリデーション
    const parsed = generateEstimateSchema.safeParse(body)
    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: 'バリデーションエラー',
        data: {
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        },
      })
    }

    const data = parsed.data

    // 会場存在確認
    const venueResult = await db.select()
      .from(venue)
      .where(and(
        eq(venue.id, data.venue_id),
        eq(venue.tenantId, ctx.tenantId),
      ))
      .limit(1)

    if (venueResult.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'VENUE_NOT_FOUND',
        message: '指定された会場が見つかりません',
      })
    }

    const selectedVenue = venueResult[0]!

    // イベント存在確認（紐付けする場合）
    if (data.event_id) {
      const eventResult = await db.select({ id: event.id })
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
    }

    // ──────────────────────────────────────
    // 見積り項目生成 (BR-EVT-003)
    // ──────────────────────────────────────

    const items: Array<{
      category: string
      name: string
      quantity: number
      unit_price: number
      subtotal: number
      note?: string
    }> = []

    // 会場費（format=online以外）
    if (data.format !== 'online') {
      items.push({
        category: 'venue',
        name: `${selectedVenue.name} 利用料`,
        quantity: 1,
        unit_price: 50000, // MVP: 固定料金
        subtotal: 50000,
      })
    }

    // 配信パッケージ費（format=online or hybrid）
    if (data.format === 'online' || data.format === 'hybrid') {
      if (data.streaming_package_id) {
        const pkgResult = await db.select()
          .from(streamingPackage)
          .where(and(
            eq(streamingPackage.id, data.streaming_package_id),
            or(
              eq(streamingPackage.tenantId, ctx.tenantId),
              isNull(streamingPackage.tenantId),
            ),
          ))
          .limit(1)

        if (pkgResult.length > 0) {
          const pkg = pkgResult[0]!
          items.push({
            category: 'streaming',
            name: pkg.name,
            quantity: 1,
            unit_price: pkg.basePrice,
            subtotal: pkg.basePrice,
          })
        }
      } else {
        // パッケージ未指定: デフォルト
        items.push({
          category: 'streaming',
          name: '基本配信パッケージ',
          quantity: 1,
          unit_price: 80000,
          subtotal: 80000,
        })
      }

      // ハイブリッドの場合、追加機材費
      if (data.format === 'hybrid') {
        items.push({
          category: 'equipment',
          name: 'ハイブリッド追加機材',
          quantity: 1,
          unit_price: 20000,
          subtotal: 20000,
          note: 'カメラスイッチャー・音声ミキサー',
        })
      }
    }

    // 追加項目
    if (data.additional_items) {
      for (const item of data.additional_items) {
        items.push({
          category: item.category,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.quantity * item.unit_price,
        })
      }
    }

    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0)

    // DB保存
    const result = await db.insert(estimate)
      .values({
        id: ulid(),
        eventId: data.event_id ?? null,
        tenantId: ctx.tenantId,
        title: `見積り: ${selectedVenue.name}`,
        items,
        totalAmount,
        status: 'draft',
        generatedBy: 'ai',
        createdBy: ctx.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never)
      .returning()

    setResponseStatus(h3Event, 201)
    return {
      data: {
        ...result[0],
        items,
        total_amount: totalAmount,
      },
    }
  } catch (err) {
    handleApiError(err)
  }
})
