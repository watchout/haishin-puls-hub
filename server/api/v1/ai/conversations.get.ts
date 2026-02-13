// AI-001 §5.4: GET /api/v1/ai/conversations
// 会話履歴一覧取得（テナント分離）

import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '~/server/utils/auth';
import { db } from '~/server/utils/db';
import { aiConversation, userTenant } from '~/server/database/schema';

const querySchema = z.object({
  eventId: z.string().optional(),
  usecase: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export default defineEventHandler(async (event) => {
  // 認証チェック
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session?.user) {
    throw createError({ statusCode: 401, data: { error: { code: 'UNAUTHORIZED', message: '認証が必要です' } } });
  }

  // テナント取得
  const [membership] = await db
    .select({ tenantId: userTenant.tenantId })
    .from(userTenant)
    .where(and(eq(userTenant.userId, session.user.id), eq(userTenant.isDefault, true)))
    .limit(1);

  if (!membership) {
    throw createError({ statusCode: 422, data: { error: { code: 'NO_TENANT', message: 'テナントに所属していません' } } });
  }

  // クエリパラメータ
  const query = getQuery(event);
  const parsed = querySchema.safeParse(query);
  if (!parsed.success) {
    throw createError({ statusCode: 400, data: { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid query' } } });
  }

  const { eventId, usecase, limit, offset } = parsed.data;

  // フィルタ条件構築
  const conditions = [
    eq(aiConversation.tenantId, membership.tenantId),
    eq(aiConversation.userId, session.user.id),
  ];
  if (eventId) conditions.push(eq(aiConversation.eventId, eventId));
  if (usecase) conditions.push(eq(aiConversation.usecase, usecase));

  // 件数取得
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiConversation)
    .where(and(...conditions));

  // 一覧取得
  const conversations = await db
    .select()
    .from(aiConversation)
    .where(and(...conditions))
    .orderBy(desc(aiConversation.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    data: {
      conversations: conversations.map((c) => ({
        id: c.id,
        usecase: c.usecase,
        eventId: c.eventId,
        messages: c.messages,
        modelProvider: c.modelProvider,
        modelName: c.modelName,
        totalInputTokens: c.totalInputTokens,
        totalOutputTokens: c.totalOutputTokens,
        estimatedCostJpy: Number(c.estimatedCostJpy),
        createdAt: c.createdAt.toISOString(),
      })),
      total: countResult?.count ?? 0,
    },
  };
});
