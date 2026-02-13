// EVT-050-051 会話詳細取得 API
// 仕様書: docs/design/features/project/EVT-050-051_ai-assistant-ui.md §5
// GET /api/v1/ai/conversations/:id

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
  const result = await db
    .select()
    .from(aiConversation)
    .where(
      and(
        eq(aiConversation.id, conversationId),
        eq(aiConversation.tenantId, tenantId),
        eq(aiConversation.userId, userId),
      ),
    )
    .limit(1)

  if (result.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'CONVERSATION_NOT_FOUND',
      message: '指定された会話が見つかりません',
    })
  }

  const conv = result[0]!

  return {
    id: conv.id,
    title: conv.title ?? '無題の会話',
    context_type: conv.contextType ?? 'general',
    context_id: conv.contextId,
    messages: conv.messages,
    model_used: `${conv.modelProvider}-${conv.modelName}`,
    total_tokens: conv.totalInputTokens + conv.totalOutputTokens,
    created_at: conv.createdAt.toISOString(),
    updated_at: conv.updatedAt.toISOString(),
  }
})
