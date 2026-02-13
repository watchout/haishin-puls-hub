// EVT-050-051 会話履歴一覧 API
// 仕様書: docs/design/features/project/EVT-050-051_ai-assistant-ui.md §5
// GET /api/v1/ai/conversations

import { createError, getQuery } from 'h3'
import { eq, and, desc, count } from 'drizzle-orm'
import { requireAuth } from '~/server/utils/permission'
import { db } from '~/server/utils/db'
import { aiConversation } from '~/server/database/schema/ai'
import { conversationListQuerySchema } from '~/server/utils/ai-chat-validation'
import type { AIMessage } from '~/server/utils/ai-chat-validation'

export default defineEventHandler(async (event) => {
  const authCtx = await requireAuth(event)
  const { userId, tenantId } = authCtx

  // クエリパラメータバリデーション
  const rawQuery = getQuery(event)
  const parsed = conversationListQuerySchema.safeParse(rawQuery)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'VALIDATION_ERROR',
      message: '入力内容に誤りがあります',
      data: parsed.error.flatten().fieldErrors,
    })
  }

  const { limit, offset, context_type } = parsed.data

  // 条件構築
  const conditions = [
    eq(aiConversation.tenantId, tenantId),
    eq(aiConversation.userId, userId),
  ]

  if (context_type) {
    conditions.push(eq(aiConversation.contextType, context_type))
  }

  // 会話一覧取得
  const [conversations, totalResult] = await Promise.all([
    db
      .select({
        id: aiConversation.id,
        title: aiConversation.title,
        contextType: aiConversation.contextType,
        messages: aiConversation.messages,
        updatedAt: aiConversation.updatedAt,
      })
      .from(aiConversation)
      .where(and(...conditions))
      .orderBy(desc(aiConversation.updatedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(aiConversation)
      .where(and(...conditions)),
  ])

  // last_message の抽出（§5: 最後のメッセージ100文字まで）
  const formattedConversations = conversations.map((conv) => {
    const messages = (conv.messages as AIMessage[]) ?? []
    const lastMsg = messages[messages.length - 1]
    const lastMessageText = lastMsg?.content ?? ''

    return {
      id: conv.id,
      title: conv.title ?? '無題の会話',
      context_type: conv.contextType ?? 'general',
      last_message: lastMessageText.length > 100
        ? lastMessageText.substring(0, 100) + '...'
        : lastMessageText,
      updated_at: conv.updatedAt.toISOString(),
    }
  })

  return {
    conversations: formattedConversations,
    total: totalResult[0]?.count ?? 0,
  }
})
