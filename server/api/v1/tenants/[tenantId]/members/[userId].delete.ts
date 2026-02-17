// ROLE-001-004 §5.2: DELETE /api/v1/tenants/:tenantId/members/:userId
// メンバー削除（テナントからの除外）
// ビジネスルール: BR-008 最低管理者数維持, BR-009 自己削除禁止

import { eq, and } from 'drizzle-orm';
import { db } from '~/server/utils/db';
import { userTenant } from '~/server/database/schema';
import {
  requirePermission,
  assertNotSelfRoleChange,
  assertMinAdminCount,
} from '~/server/utils/permission';

export default defineEventHandler(async (event) => {
  // 権限チェック: member の manage 権限が必要（tenant_admin 以上）
  const authCtx = await requirePermission(event, 'manage', 'member');

  const tenantId = getRouterParam(event, 'tenantId');
  const targetUserId = getRouterParam(event, 'userId');

  if (!tenantId || !targetUserId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'VALIDATION_ERROR',
      message: 'tenantId と userId は必須です',
    });
  }

  // テナント分離
  if (authCtx.role !== 'system_admin' && authCtx.tenantId !== tenantId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'FORBIDDEN',
      message: '他テナントのメンバーは削除できません',
    });
  }

  // BR-009: 自己削除禁止（assertNotSelfRoleChange を流用）
  assertNotSelfRoleChange(authCtx.userId, targetUserId);

  // 対象メンバーの存在確認
  const [existing] = await db
    .select({ role: userTenant.role })
    .from(userTenant)
    .where(
      and(
        eq(userTenant.userId, targetUserId),
        eq(userTenant.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'RESOURCE_NOT_FOUND',
      message: '対象メンバーが見つかりません',
    });
  }

  // BR-008: tenant_admin を削除する場合、最低管理者数チェック
  if (existing.role === 'tenant_admin') {
    await assertMinAdminCount(tenantId);
  }

  // メンバー削除
  await db
    .delete(userTenant)
    .where(
      and(
        eq(userTenant.userId, targetUserId),
        eq(userTenant.tenantId, tenantId),
      ),
    );

  return { data: { success: true } };
});
