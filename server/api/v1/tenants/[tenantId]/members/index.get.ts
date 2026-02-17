// ROLE-001-004 §5.2: GET /api/v1/tenants/:tenantId/members
// テナントメンバー一覧取得

import { eq } from 'drizzle-orm';
import { db } from '~/server/utils/db';
import { userTenant, user } from '~/server/database/schema';
import { requirePermission } from '~/server/utils/permission';

export default defineEventHandler(async (event) => {
  // 権限チェック: member の read 権限が必要
  const authCtx = await requirePermission(event, 'read', 'member');

  const tenantId = getRouterParam(event, 'tenantId');
  if (!tenantId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'VALIDATION_ERROR',
      message: 'tenantId は必須です',
    });
  }

  // テナント分離: 自テナントのメンバーのみ取得可能（system_admin は除く）
  if (authCtx.role !== 'system_admin' && authCtx.tenantId !== tenantId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'FORBIDDEN',
      message: '他テナントのメンバーは参照できません',
    });
  }

  const members = await db
    .select({
      userId: userTenant.userId,
      tenantId: userTenant.tenantId,
      role: userTenant.role,
      isDefault: userTenant.isDefault,
      joinedAt: userTenant.joinedAt,
      userName: user.name,
      userEmail: user.email,
      userAvatarUrl: user.avatarUrl,
    })
    .from(userTenant)
    .innerJoin(user, eq(userTenant.userId, user.id))
    .where(eq(userTenant.tenantId, tenantId))
    .orderBy(userTenant.joinedAt);

  return {
    data: members.map((m) => ({
      user_id: m.userId,
      tenant_id: m.tenantId,
      role: m.role,
      is_default: m.isDefault,
      joined_at: m.joinedAt.toISOString(),
      user: {
        name: m.userName,
        email: m.userEmail,
        avatar_url: m.userAvatarUrl,
      },
    })),
  };
});
