// ROLE-001-004 §5.3: GET /api/v1/permissions/check
// 権限チェックエンドポイント（フロントエンドでのプリチェック用）

import { z } from 'zod';
import { requireAuth } from '~/server/utils/permission';
import { hasPermission, ACTIONS, RESOURCES } from '~/server/utils/permission-matrix';
import type { Role } from '~/types/auth';

const querySchema = z.object({
  action: z.enum(ACTIONS),
  resource: z.enum(RESOURCES),
});

export default defineEventHandler(async (event) => {
  const authCtx = await requireAuth(event);

  const query = getQuery(event);
  const parsed = querySchema.safeParse(query);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'VALIDATION_ERROR',
      message: '有効な action と resource を指定してください',
    });
  }

  const { action, resource } = parsed.data;
  const role = authCtx.role as Role;
  const allowed = hasPermission(role, action, resource);

  return {
    data: {
      allowed,
      role,
      reason: allowed ? null : `${role} は ${action} on ${resource} の権限がありません`,
    },
  };
});
