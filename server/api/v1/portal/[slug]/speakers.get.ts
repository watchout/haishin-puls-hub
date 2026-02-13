// EVT-030 §5.1: 登壇者一覧取得（認証不要 Public API）
// GET /api/v1/portal/:slug/speakers
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

    // イベント取得
    const events = await db.select({ id: event.id, settings: event.settings })
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
    const settings = (evt.settings as Record<string, unknown>) ?? {}
    if (!settings.portal_published) {
      throw createError({
        statusCode: 404,
        statusMessage: 'PORTAL_NOT_FOUND',
        message: 'ポータルが見つかりません',
      })
    }

    // 確認済み登壇者のみ取得
    const speakers = await db.select({
      id: speaker.id,
      name: speaker.name,
      title: speaker.title,
      organization: speaker.organization,
      bio: speaker.bio,
      photoUrl: speaker.photoUrl,
      presentationTitle: speaker.presentationTitle,
      sortOrder: speaker.sortOrder,
    })
      .from(speaker)
      .where(
        and(
          eq(speaker.eventId, evt.id),
          eq(speaker.submissionStatus, 'confirmed'),
        ),
      )

    return {
      speakers: speakers.map(spk => ({
        id: spk.id,
        name: spk.name,
        title: spk.title,
        organization: spk.organization,
        bio: spk.bio,
        photoUrl: spk.photoUrl,
        presentationTitle: spk.presentationTitle,
        sortOrder: spk.sortOrder,
      })),
    }
  } catch (err) {
    handleApiError(err)
  }
})
