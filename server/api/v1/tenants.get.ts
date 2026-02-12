// ACCT-002 §5.3: GET /api/v1/tenants
// ユーザーの所属テナント一覧取得

import { eq } from 'drizzle-orm'
import { auth } from '~/server/utils/auth'
import { db } from '~/server/utils/db'
import { userTenant, tenant } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  // 認証チェック
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      data: { error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
    })
  }

  // ユーザーの所属テナント一覧を取得（tenant JOIN）
  const memberships = await db
    .select({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.logoUrl,
      role: userTenant.role,
      isDefault: userTenant.isDefault,
      joinedAt: userTenant.joinedAt,
    })
    .from(userTenant)
    .innerJoin(tenant, eq(userTenant.tenantId, tenant.id))
    .where(eq(userTenant.userId, session.user.id))
    .orderBy(userTenant.joinedAt)

  return {
    data: memberships.map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      logo_url: m.logoUrl,
      role: m.role,
      is_default: m.isDefault,
      joined_at: m.joinedAt.toISOString(),
    })),
  }
})
