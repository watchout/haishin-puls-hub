// AI-001 §5.5: GET /api/v1/ai/usage
// トークン使用量とコストレポート

import { eq, and, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '~/server/utils/auth';
import { db } from '~/server/utils/db';
import { aiConversation, userTenant } from '~/server/database/schema';

const querySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly']).default('monthly'),
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
    throw createError({ statusCode: 400, data: { error: { code: 'VALIDATION_ERROR', message: 'Invalid period parameter' } } });
  }

  // 期間計算
  const now = new Date();
  const periodStart = new Date(now);
  switch (parsed.data.period) {
    case 'daily':
      periodStart.setHours(0, 0, 0, 0);
      break;
    case 'weekly':
      periodStart.setDate(now.getDate() - 7);
      break;
    case 'monthly':
      periodStart.setMonth(now.getMonth() - 1);
      break;
  }

  // 集計クエリ
  const [totals] = await db
    .select({
      totalInputTokens: sql<number>`coalesce(sum(${aiConversation.totalInputTokens}), 0)::int`,
      totalOutputTokens: sql<number>`coalesce(sum(${aiConversation.totalOutputTokens}), 0)::int`,
      estimatedCostJpy: sql<number>`coalesce(sum(${aiConversation.estimatedCostJpy}::numeric), 0)::int`,
      requestCount: sql<number>`count(*)::int`,
    })
    .from(aiConversation)
    .where(
      and(
        eq(aiConversation.tenantId, membership.tenantId),
        gte(aiConversation.createdAt, periodStart),
      ),
    );

  // モデル別集計
  const byModel = await db
    .select({
      modelName: aiConversation.modelName,
      inputTokens: sql<number>`coalesce(sum(${aiConversation.totalInputTokens}), 0)::int`,
      outputTokens: sql<number>`coalesce(sum(${aiConversation.totalOutputTokens}), 0)::int`,
      costJpy: sql<number>`coalesce(sum(${aiConversation.estimatedCostJpy}::numeric), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(aiConversation)
    .where(
      and(
        eq(aiConversation.tenantId, membership.tenantId),
        gte(aiConversation.createdAt, periodStart),
      ),
    )
    .groupBy(aiConversation.modelName);

  const byModelMap: Record<string, { input: number; output: number; costJpy: number; count: number }> = {};
  for (const row of byModel) {
    byModelMap[row.modelName] = {
      input: row.inputTokens,
      output: row.outputTokens,
      costJpy: row.costJpy,
      count: row.count,
    };
  }

  return {
    data: {
      period: parsed.data.period,
      periodStart: periodStart.toISOString(),
      totalInputTokens: totals?.totalInputTokens ?? 0,
      totalOutputTokens: totals?.totalOutputTokens ?? 0,
      estimatedCostJpy: totals?.estimatedCostJpy ?? 0,
      requestCount: totals?.requestCount ?? 0,
      byModel: byModelMap,
    },
  };
});
