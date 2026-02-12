// AI-001 §5.5: PUT /api/v1/admin/ai/prompt-templates/:id
// プロンプトテンプレート更新（新バージョン作成）
// 既存テンプレートを is_active=false にし、version+1 で新規作成

import { eq, and } from 'drizzle-orm';
import { ulid } from 'ulid';
import { auth } from '~/server/utils/auth';
import { db } from '~/server/utils/db';
import { promptTemplate, userTenant } from '~/server/database/schema';
import { createPromptTemplateSchema } from '~/types/ai';

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

  const templateId = getRouterParam(event, 'id');
  if (!templateId) {
    throw createError({ statusCode: 400, data: { error: { code: 'VALIDATION_ERROR', message: 'Template ID is required' } } });
  }

  // 既存テンプレート取得
  const [existing] = await db
    .select()
    .from(promptTemplate)
    .where(
      and(
        eq(promptTemplate.id, templateId),
        eq(promptTemplate.tenantId, membership.tenantId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw createError({ statusCode: 404, data: { error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template not found' } } });
  }

  // リクエストバリデーション
  const body = await readBody(event);
  const parsed = createPromptTemplateSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      data: { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid request', details: parsed.error.issues } },
    });
  }

  // トランザクション: 旧バージョンを無効化 + 新バージョン作成
  const newId = ulid();
  const newVersion = existing.version + 1;

  // 旧バージョンを無効化
  await db
    .update(promptTemplate)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(promptTemplate.id, templateId));

  // 新バージョン作成
  const [created] = await db
    .insert(promptTemplate)
    .values({
      id: newId,
      tenantId: membership.tenantId,
      usecase: parsed.data.usecase,
      name: parsed.data.name,
      systemPrompt: parsed.data.systemPrompt,
      userPromptTemplate: parsed.data.userPromptTemplate,
      variables: parsed.data.variables,
      modelConfig: parsed.data.modelConfig,
      version: newVersion,
      isActive: true,
    })
    .returning();

  if (!created) {
    throw createError({ statusCode: 500, data: { error: { code: 'INTERNAL_ERROR', message: 'Failed to create template version' } } });
  }

  return {
    data: {
      id: created.id,
      usecase: created.usecase,
      name: created.name,
      version: created.version,
      isActive: created.isActive,
      createdAt: created.createdAt.toISOString(),
    },
  };
});
