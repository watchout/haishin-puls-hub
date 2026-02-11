// GET /api/v1/invitations/:token
// ACCT-001 §5 / §7.1: 招待情報取得
// トークンを検証し、招待のテナント名・ロール・メールアドレスを返す

import { eq } from 'drizzle-orm';
import { db } from '~/server/utils/db';
import { invitation, tenant } from '~/server/database/schema';

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token');

  if (!token) {
    throw createError({
      statusCode: 400,
      data: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'トークンが指定されていません',
        },
      },
    });
  }

  // 招待レコードをテナント情報と一緒に取得
  const results = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      tenantId: invitation.tenantId,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
    })
    .from(invitation)
    .innerJoin(tenant, eq(invitation.tenantId, tenant.id))
    .where(eq(invitation.token, token))
    .limit(1);

  const inv = results[0];

  // トークン無効（存在しない）
  if (!inv) {
    throw createError({
      statusCode: 404,
      data: {
        error: {
          code: 'INVITATION_NOT_FOUND',
          message: '招待リンクが無効です',
        },
      },
    });
  }

  // 使用済み
  if (inv.status === 'accepted') {
    throw createError({
      statusCode: 409,
      data: {
        error: {
          code: 'INVITATION_ALREADY_USED',
          message: 'この招待リンクは既に使用されています',
        },
      },
    });
  }

  // 期限切れ
  if (inv.status === 'expired' || new Date() > new Date(inv.expiresAt)) {
    throw createError({
      statusCode: 410,
      data: {
        error: {
          code: 'INVITATION_EXPIRED',
          message: '招待リンクの有効期限が切れています。管理者に再招待をご依頼ください',
        },
      },
    });
  }

  // 有効な招待 → 情報を返す
  return {
    data: {
      email: inv.email,
      role: inv.role,
      tenant: {
        id: inv.tenantId,
        name: inv.tenantName,
        slug: inv.tenantSlug,
      },
    },
  };
});
