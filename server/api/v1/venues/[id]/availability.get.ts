// VENUE-001-004: 会場空き状況取得 API
// GET /api/v1/venues/:id/availability?start_date=2026-03-01&end_date=2026-03-07
// 仕様書: §3-E #6, §5 Venue API - GET /api/v1/venues/:id/availability
import { eq, and, gte, lte } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'
import { venue, event } from '~/server/database/schema'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'read', 'venue')
    const venueId = getRouterParam(h3Event, 'id')

    if (!venueId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: '会場IDが指定されていません',
      })
    }

    const query = getQuery(h3Event)
    const startDate = query.start_date as string
    const endDate = query.end_date as string

    if (!startDate || !endDate) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: 'start_date と end_date は必須です',
      })
    }

    // 会場存在確認 + テナント分離
    const venueRecord = await db.select()
      .from(venue)
      .where(and(
        eq(venue.id, venueId),
        eq(venue.tenantId, ctx.tenantId),
      ))
      .limit(1)

    if (venueRecord.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'NOT_FOUND',
        message: '指定された会場が見つかりません',
      })
    }

    // 期間内のイベントを取得
    const startTimestamp = new Date(`${startDate}T00:00:00Z`)
    const endTimestamp = new Date(`${endDate}T23:59:59Z`)

    const events = await db.select({
      id: event.id,
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
    })
      .from(event)
      .where(and(
        eq(event.venueId, venueId),
        eq(event.tenantId, ctx.tenantId),
        gte(event.startAt as never, startTimestamp as never),
        lte(event.startAt as never, endTimestamp as never),
      ))

    // 日別の空き状況を構築
    const availability = []
    const current = new Date(startTimestamp)
    const end = new Date(endTimestamp)

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      const dayEvents = events.filter((e) => {
        if (!e.startAt) return false
        return e.startAt.toISOString().startsWith(dateStr)
      })

      if (dayEvents.length > 0) {
        for (const evt of dayEvents) {
          availability.push({
            date: dateStr,
            status: 'booked' as const,
            event_id: evt.id,
            event_title: evt.title,
          })
        }
      } else {
        availability.push({
          date: dateStr,
          status: 'available' as const,
        })
      }

      current.setDate(current.getDate() + 1)
    }

    return {
      venue_id: venueId,
      venue_name: `${venueRecord[0].name}${venueRecord[0].branchName ? ` ${venueRecord[0].branchName}` : ''}`,
      availability,
    }
  } catch (err) {
    handleApiError(err)
  }
})
