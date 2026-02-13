// EVT-050-051 会話削除 API
// 仕様書: docs/design/features/project/EVT-050-051_ai-assistant-ui.md §3-E E-6
// DELETE /api/v1/ai/conversations/:id

import { createError } from 'h3'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '~/server/utils/permission'
import { db } from '~/server/utils/db'
import { aiConversation } from '~/server/database/schema/ai'

export default defineEventHandler(async (event) => {
  const authCtx = await requireAuth(event)
  const { userId, tenantId } = authCtx

  const conversationId = getRouterParam(event, 'id')
  if (!conversationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'VALIDATION_ERROR',
      message: '会話IDが必要です',
    })
  }

  // テナント境界 + ユーザー所有権チェック
  const existing = await db
    .select({ id: aiConversation.id })
    .from(aiConversation)
    .where(
      and(
        eq(aiConversation.id, conversationId),
        eq(aiConversation.tenantId, tenantId),
        eq(aiConversation.userId, userId),
      ),
    )
    .limit(1)

  if (existing.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'CONVERSATION_NOT_FOUND',
      message: '指定された会話が見つかりません',
    })
  }

  // 削除実行
  await db
    .delete(aiConversation)
    .where(eq(aiConversation.id, conversationId))

  return {
    success: true,
    deleted_id: conversationId,
    message: '会話を削除しました',
  }
})
