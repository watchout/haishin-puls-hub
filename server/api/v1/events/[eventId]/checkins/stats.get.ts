// EVT-031 §5.2: チェックイン統計（認証必須）
// GET /api/v1/events/:eid/checkins/stats
import { eq, and, sql } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { participant, checkin } from '~/server/database/schema/participant'
import { requirePermission } from '~/server/utils/permission'
import { handleApiError } from '~/server/utils/api-error'

export default defineEventHandler(async (h3Event) => {
  try {
    const ctx = await requirePermission(h3Event, 'read', 'participant')
    const eventId = getRouterParam(h3Event, 'eventId')

    if (!eventId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: 'イベントIDが指定されていません',
      })
    }

    // 参加者統計
    const participantStats = await db.select({
      totalRegistered: sql<number>`count(*)::int`,
      onsiteRegistered: sql<number>`count(*) filter (where ${participant.participationType} = 'onsite')::int`,
      onlineRegistered: sql<number>`count(*) filter (where ${participant.participationType} = 'online')::int`,
    })
      .from(participant)
      .where(
        and(
          eq(participant.eventId, eventId),
          eq(participant.tenantId, ctx.tenantId),
        ),
      )

    // チェックイン統計
    const checkinStats = await db.select({
      checkedIn: sql<number>`count(*)::int`,
      walkIn: sql<number>`count(*) filter (where ${checkin.method} = 'walk_in')::int`,
    })
      .from(checkin)
      .where(
        and(
          eq(checkin.eventId, eventId),
          eq(checkin.tenantId, ctx.tenantId),
        ),
      )

    // 参加形態別チェックイン数
    const checkinByType = await db.select({
      participationType: participant.participationType,
      count: sql<number>`count(*)::int`,
    })
      .from(checkin)
      .innerJoin(participant, eq(checkin.participantId, participant.id))
      .where(
        and(
          eq(checkin.eventId, eventId),
          eq(checkin.tenantId, ctx.tenantId),
        ),
      )
      .groupBy(participant.participationType)

    // 時系列データ（30分刻み）
    const timeline = await db.select({
      time: sql<string>`date_trunc('hour', ${checkin.checkedInAt}) + interval '30 min' * floor(extract(minute from ${checkin.checkedInAt}) / 30)`,
      count: sql<number>`count(*)::int`,
    })
      .from(checkin)
      .where(
        and(
          eq(checkin.eventId, eventId),
          eq(checkin.tenantId, ctx.tenantId),
        ),
      )
      .groupBy(sql`date_trunc('hour', ${checkin.checkedInAt}) + interval '30 min' * floor(extract(minute from ${checkin.checkedInAt}) / 30)`)
      .orderBy(sql`date_trunc('hour', ${checkin.checkedInAt}) + interval '30 min' * floor(extract(minute from ${checkin.checkedInAt}) / 30)`)

    const totalRegistered = participantStats[0]?.totalRegistered ?? 0
    const checkedIn = checkinStats[0]?.checkedIn ?? 0
    const walkIn = checkinStats[0]?.walkIn ?? 0

    const onsiteCheckedIn = checkinByType.find(t => t.participationType === 'onsite')?.count ?? 0
    const onlineCheckedIn = checkinByType.find(t => t.participationType === 'online')?.count ?? 0

    return {
      total_registered: totalRegistered,
      checked_in: checkedIn,
      not_checked_in: totalRegistered - checkedIn,
      walk_in: walkIn,
      checkin_rate: totalRegistered > 0 ? Math.round((checkedIn / totalRegistered) * 1000) / 10 : 0,
      by_participation_type: {
        onsite: {
          registered: participantStats[0]?.onsiteRegistered ?? 0,
          checked_in: onsiteCheckedIn,
        },
        online: {
          registered: participantStats[0]?.onlineRegistered ?? 0,
          checked_in: onlineCheckedIn,
        },
      },
      timeline: timeline.map(t => ({
        time: t.time,
        count: t.count,
      })),
    }
  } catch (err) {
    handleApiError(err)
  }
})
