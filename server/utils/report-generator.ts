// EVT-040: AI レポート生成ユーティリティ（DB依存）
// 仕様書: docs/design/features/project/EVT-040_summary-report.md §3 FR-040-02, BR-040-03

import { eq, and, sql } from 'drizzle-orm'
import { db } from '~/server/utils/db'
import { event } from '~/server/database/schema/event'
import { participant, checkin } from '~/server/database/schema/participant'
import { eventReport } from '~/server/database/schema/report'
import { ulid } from 'ulid'
import {
  generateReportTemplate,
  buildReportMetadata,
} from '~/server/utils/report-helpers'
import type { ParticipantStats, ReportMetadata } from '~/server/utils/report-helpers'

// re-export pure functions for convenience
export type { ParticipantStats, ReportMetadata }
export {
  buildReportPrompt,
  buildReportMetadata,
  getSystemPrompt,
  generateReportTemplate,
} from '~/server/utils/report-helpers'

// ──────────────────────────────────────
// データ取得関数
// ──────────────────────────────────────

/**
 * 参加者統計を取得
 */
export async function getParticipantStats(eventId: string): Promise<ParticipantStats> {
  const stats = await db.select({
    total: sql<number>`count(*)::int`,
    onsiteRegistered: sql<number>`count(*) filter (where ${participant.participationType} = 'onsite')::int`,
    onlineRegistered: sql<number>`count(*) filter (where ${participant.participationType} = 'online')::int`,
  })
    .from(participant)
    .where(eq(participant.eventId, eventId))

  const checkinStats = await db.select({
    totalCheckins: sql<number>`count(*)::int`,
    onsiteCheckins: sql<number>`count(*) filter (where ${participant.participationType} = 'onsite')::int`,
    onlineCheckins: sql<number>`count(*) filter (where ${participant.participationType} = 'online')::int`,
    walkIns: sql<number>`count(*) filter (where ${checkin.method} = 'walk_in')::int`,
  })
    .from(checkin)
    .innerJoin(participant, eq(checkin.participantId, participant.id))
    .where(eq(checkin.eventId, eventId))

  const s = stats[0]
  const c = checkinStats[0]

  return {
    registrationCount: s?.total ?? 0,
    onsiteRegistered: s?.onsiteRegistered ?? 0,
    onlineRegistered: s?.onlineRegistered ?? 0,
    onsiteCheckinCount: c?.onsiteCheckins ?? 0,
    onlineCheckinCount: c?.onlineCheckins ?? 0,
    totalCheckinCount: c?.totalCheckins ?? 0,
    walkInCount: c?.walkIns ?? 0,
  }
}

/**
 * レポート全体を生成して DB に保存（MVP: 同期実行）
 */
export async function createEventReport(
  eventId: string,
  tenantId: string,
  reportType: string = 'summary',
): Promise<{ id: string; content: string; metadata: ReportMetadata }> {
  const startTime = Date.now()

  // 1. イベントデータ取得
  const eventRows = await db.select().from(event).where(
    and(
      eq(event.id, eventId),
      eq(event.tenantId, tenantId),
    ),
  ).limit(1)

  if (eventRows.length === 0) {
    throw new Error('EVENT_NOT_FOUND')
  }

  const eventData = eventRows[0] as Record<string, unknown>

  // 2. 参加者統計取得
  const stats = await getParticipantStats(eventId)

  // 3. レポートコンテンツ生成（テンプレートベース、AI API導入後に差し替え）
  const content = generateReportTemplate(eventData, stats)

  // 4. メタデータ構築
  const generationTime = (Date.now() - startTime) / 1000
  const metadata = buildReportMetadata(stats, generationTime)

  // 5. DB保存
  const reportId = ulid()
  await db.insert(eventReport).values({
    id: reportId,
    eventId,
    tenantId,
    reportType,
    content,
    metadata,
    generatedBy: 'ai',
    status: 'draft',
  })

  return { id: reportId, content, metadata }
}
