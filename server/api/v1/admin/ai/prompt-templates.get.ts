// AI-001 §5.5: GET /api/v1/admin/ai/prompt-templates
// プロンプトテンプレート一覧取得（テナント管理者専用）

import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '~/server/utils/auth';
import { db } from '~/server/utils/db';
import { promptTemplate, userTenant } from '~/server/database/schema';

const querySchema = z.object({
  usecase: z.string().optional(),
  activeOnly: z.coerce.boolean().default(false),
});

export default defineEventHandler(async (event) => {
  // 認証 + テナント管理者チェック
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session?.user) {
    throw createError({ statusCode: 401, data: { error: { code: 'UNAUTHORIZED', message: '認証が必要です' } } });
  }

  const [membership] = await db
    .select({ tenantId: userTenant.tenantId, role: userTenant.role })
    .from(userTenant)
    .where(and(eq(userTenant.userId, session.user.id), eq(userTenant.isDefault, true)))
    .limit(1);

  if (!membership) {
    throw createError({ statusCode: 422, data: { error: { code: 'NO_TENANT', message: 'テナントに所属していません' } } });
  }

  if (membership.role !== 'tenant_admin' && membership.role !== 'system_admin') {
    throw createError({ statusCode: 403, data: { error: { code: 'FORBIDDEN', message: 'テナント管理者権限が必要です' } } });
  }

  const query = getQuery(event);
  const parsed = querySchema.safeParse(query);
  if (!parsed.success) {
    throw createError({ statusCode: 400, data: { error: { code: 'VALIDATION_ERROR', message: 'Invalid query' } } });
  }

  const conditions = [eq(promptTemplate.tenantId, membership.tenantId)];
  if (parsed.data.usecase) conditions.push(eq(promptTemplate.usecase, parsed.data.usecase));
  if (parsed.data.activeOnly) conditions.push(eq(promptTemplate.isActive, true));

  const templates = await db
    .select()
    .from(promptTemplate)
    .where(and(...conditions))
    .orderBy(desc(promptTemplate.createdAt));

  return {
    data: {
      templates: templates.map((t) => ({
        id: t.id,
        usecase: t.usecase,
        name: t.name,
        systemPrompt: t.systemPrompt,
        userPromptTemplate: t.userPromptTemplate,
        variables: t.variables,
        modelConfig: t.modelConfig,
        version: t.version,
        isActive: t.isActive,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    },
  };
});
