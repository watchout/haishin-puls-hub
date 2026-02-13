// EVT-030 §5.2: 参加者一覧取得（認証必須、検索・フィルタ機能付き）
// GET /api/v1/events/:eid/participants
import { eq, and, or, like, sql } from 'drizzle-orm'
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

    const query = getQuery(h3Event)
    const searchQuery = (query.q as string) || ''
    const participationType = query.participation_type as string || ''
    const registrationStatus = query.registration_status as string || ''
    const checkedInFilter = query.checked_in as string || ''
    const page = Math.max(1, Number(query.page) || 1)
    const perPage = Math.min(100, Math.max(1, Number(query.per_page) || 20))
    const offset = (page - 1) * perPage

    // 基本フィルタ: テナント + イベント
    const baseConditions = [
      eq(participant.eventId, eventId),
      eq(participant.tenantId, ctx.tenantId),
    ]

    // 検索フィルタ（名前・メール・組織名で部分一致）
    if (searchQuery) {
      baseConditions.push(
        or(
          like(participant.name, `%${searchQuery}%`),
          like(participant.email, `%${searchQuery}%`),
          like(participant.organization, `%${searchQuery}%`),
        ) as never,
      )
    }

    // 参加形態フィルタ
    if (participationType && ['onsite', 'online'].includes(participationType)) {
      baseConditions.push(eq(participant.participationType, participationType))
    }

    // 登録ステータスフィルタ
    if (registrationStatus && ['registered', 'confirmed', 'cancelled'].includes(registrationStatus)) {
      baseConditions.push(eq(participant.registrationStatus, registrationStatus))
    }

    const whereCondition = and(...baseConditions)

    // 参加者一覧取得（チェックイン情報を含む）
    const [data, countResult] = await Promise.all([
      db.select({
        id: participant.id,
        name: participant.name,
        email: participant.email,
        organization: participant.organization,
        participationType: participant.participationType,
        registrationStatus: participant.registrationStatus,
        qrCode: participant.qrCode,
        customFields: participant.customFields,
        registeredAt: participant.registeredAt,
        createdAt: participant.createdAt,
        // チェックイン情報（LEFT JOIN）
        checkinId: checkin.id,
        checkedInAt: checkin.checkedInAt,
        checkinMethod: checkin.method,
      })
        .from(participant)
        .leftJoin(
          checkin,
          and(
            eq(checkin.participantId, participant.id),
            eq(checkin.eventId, eventId),
          ),
        )
        .where(whereCondition)
        .limit(perPage)
        .offset(offset)
        .orderBy(participant.createdAt),

      db.select({ count: sql<number>`count(*)::int` })
        .from(participant)
        .where(whereCondition),
    ])

    const total = countResult[0]?.count ?? 0

    // チェックインフィルタ（JOINの結果で判定）
    let filteredData = data
    if (checkedInFilter === 'true') {
      filteredData = data.filter(d => d.checkinId !== null)
    } else if (checkedInFilter === 'false') {
      filteredData = data.filter(d => d.checkinId === null)
    }

    return {
      participants: filteredData.map(d => ({
        id: d.id,
        name: d.name,
        email: d.email,
        organization: d.organization,
        participationType: d.participationType,
        registrationStatus: d.registrationStatus,
        checkedIn: d.checkinId !== null,
        checkedInAt: d.checkedInAt ? d.checkedInAt.toISOString() : null,
        checkinMethod: d.checkinMethod,
        registeredAt: d.registeredAt.toISOString(),
      })),
      total,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    }
  } catch (err) {
    handleApiError(err)
  }
})
