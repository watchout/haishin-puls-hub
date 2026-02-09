// POST /api/v1/auth/login-context → GET に変更
// AUTH-001 §5.3: ログイン後コンテキスト取得
// セッションからユーザーを取得し、テナント・ロール・リダイレクト先を返却

import { eq, and } from 'drizzle-orm';
import { auth } from '~/server/utils/auth';
import { db } from '~/server/utils/db';
import { userTenant, tenant } from '~/server/database/schema';
import { ROLE_REDIRECT_MAP } from '~/types/auth';
import type { Role } from '~/types/auth';

export default defineEventHandler(async (event) => {
  // 1. セッションからユーザーを取得
  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      data: {
        error: {
          code: 'UNAUTHORIZED',
          message: '認証が必要です',
        },
      },
    });
  }

  const userId = session.user.id;

  // 2. user_tenant から is_default = true のレコードを取得
  const memberships = await db
    .select({
      tenantId: userTenant.tenantId,
      role: userTenant.role,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
    })
    .from(userTenant)
    .innerJoin(tenant, eq(userTenant.tenantId, tenant.id))
    .where(
      and(
        eq(userTenant.userId, userId),
        eq(userTenant.isDefault, true),
      ),
    )
    .limit(1);

  const membership = memberships[0];

  if (!membership) {
    throw createError({
      statusCode: 422,
      data: {
        error: {
          code: 'NO_TENANT',
          message: 'テナントに所属していません',
        },
      },
    });
  }

  const role = membership.role as Role;

  // 3. ロール別リダイレクト先を決定
  const redirectTo = ROLE_REDIRECT_MAP[role] ?? '/app';

  // 4. レスポンス返却
  return {
    data: {
      tenant: {
        id: membership.tenantId,
        name: membership.tenantName,
        slug: membership.tenantSlug,
      },
      role,
      redirectTo,
    },
  };
});
