// EVT-030 §5.1: ポータル情報取得（認証不要 Public API）
// GET /api/v1/portal/:slug
import { eq, and } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { event } from '~/server/database/schema/event'
import { speaker } from '~/server/database/schema/speaker'
import { handleApiError } from '~/server/utils/api-error'

export default defineEventHandler(async (h3Event) => {
  try {
    const slug = getRouterParam(h3Event, 'slug')

    if (!slug) {
      throw createError({
        statusCode: 400,
        statusMessage: 'VALIDATION_ERROR',
        message: 'スラッグが指定されていません',
      })
    }

    // ポータル情報取得（portal_slug で検索）
    const events = await db.select()
      .from(event)
      .where(eq(event.portalSlug, slug))
      .limit(1)

    if (events.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'PORTAL_NOT_FOUND',
        message: 'ポータルが見つかりません',
      })
    }

    const evt = events[0]!

    // BR-4: ポータル公開チェック
    const settings = (evt.settings as Record<string, unknown>) ?? {}
    if (!settings.portal_published) {
      throw createError({
        statusCode: 404,
        statusMessage: 'PORTAL_NOT_FOUND',
        message: 'ポータルが見つかりません',
      })
    }

    // 登壇者一覧取得（confirmed のみ）
    const speakers = await db.select({
      id: speaker.id,
      name: speaker.name,
      title: speaker.title,
      organization: speaker.organization,
      bio: speaker.bio,
      photoUrl: speaker.photoUrl,
      presentationTitle: speaker.presentationTitle,
      startAt: speaker.startAt,
      durationMinutes: speaker.durationMinutes,
      format: speaker.format,
      sortOrder: speaker.sortOrder,
    })
      .from(speaker)
      .where(
        and(
          eq(speaker.eventId, evt.id),
          eq(speaker.submissionStatus, 'confirmed'),
        ),
      )

    // イベント終了判定（アーカイブモード）
    const isArchived = evt.endAt ? new Date(evt.endAt) < new Date() : false
    const isCancelled = evt.status === 'cancelled'

    return {
      event: {
        id: evt.id,
        title: evt.title,
        description: evt.description,
        eventType: evt.eventType,
        format: evt.format,
        status: evt.status,
        startAt: evt.startAt,
        endAt: evt.endAt,
        capacityOnsite: evt.capacityOnsite,
        capacityOnline: evt.capacityOnline,
        streamingUrl: evt.streamingUrl,
        wifi: settings.wifi_ssid ? {
          ssid: settings.wifi_ssid,
          password: settings.wifi_password ?? null,
        } : null,
        venueInfo: settings.venue_info ?? null,
        isArchived,
        isCancelled,
      },
      speakers: speakers.map(spk => ({
        id: spk.id,
        name: spk.name,
        title: spk.title,
        organization: spk.organization,
        bio: spk.bio,
        photoUrl: spk.photoUrl,
        presentationTitle: spk.presentationTitle,
        startAt: spk.startAt,
        durationMinutes: spk.durationMinutes,
        format: spk.format,
        sortOrder: spk.sortOrder,
      })),
    }
  } catch (err) {
    handleApiError(err)
  }
})
