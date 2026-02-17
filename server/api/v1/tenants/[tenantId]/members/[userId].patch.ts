// ROLE-001-004 §5.2: PATCH /api/v1/tenants/:tenantId/members/:userId
// メンバーロール変更
// ビジネスルール: BR-008 最低管理者数維持, BR-009 自己ロール変更禁止

import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '~/server/utils/db';
import { userTenant } from '~/server/database/schema';
import {
  requirePermission,
  assertNotSelfRoleChange,
  assertMinAdminCount,
} from '~/server/utils/permission';
import { ROLES } from '~/types/auth';

/** ロール変更リクエストのバリデーション */
const updateRoleSchema = z.object({
  role: z.enum(ROLES).refine(
    (val) => val !== 'system_admin',
    { message: 'system_admin は招待で付与できません' },
  ),
});

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
      message: '他テナントのメンバーロールは変更できません',
    });
  }

  // リクエストバリデーション
  const body = await readBody(event);
  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ROLE_INVALID',
      message: parsed.error.errors[0]?.message ?? '無効なロールです',
    });
  }

  const { role: newRole } = parsed.data;

  // BR-009: 自己ロール変更の禁止
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

  // BR-008: tenant_admin から他ロールへ変更する場合、最低管理者数チェック
  if (existing.role === 'tenant_admin' && newRole !== 'tenant_admin') {
    await assertMinAdminCount(tenantId);
  }

  // ロール更新
  const now = new Date();
  const [updated] = await db
    .update(userTenant)
    .set({
      role: newRole,
      updatedAt: now,
    })
    .where(
      and(
        eq(userTenant.userId, targetUserId),
        eq(userTenant.tenantId, tenantId),
      ),
    )
    .returning({
      userId: userTenant.userId,
      tenantId: userTenant.tenantId,
      role: userTenant.role,
      updatedAt: userTenant.updatedAt,
    });

  return {
    data: {
      user_id: updated!.userId,
      tenant_id: updated!.tenantId,
      role: updated!.role,
      updated_at: updated!.updatedAt.toISOString(),
    },
  };
});
