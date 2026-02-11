// POST /api/v1/invitations/:token/accept
// ACCT-001 §5.3 / §6.2 / §7.1: 招待承認 + サインアップ
// トランザクション: Better Auth ユーザー作成 → user_tenant INSERT → invitation 更新

import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';
import { auth } from '~/server/utils/auth';
import { db } from '~/server/utils/db';
import { invitation, userTenant, tenant } from '~/server/database/schema';
import { ROLE_REDIRECT_MAP } from '~/types/auth';
import type { Role } from '~/types/auth';

// リクエストボディのバリデーション
const acceptBodySchema = z.object({
  name: z
    .string({ required_error: '名前を入力してください' })
    .min(1, '名前を入力してください')
    .max(100, '名前は100文字以内で入力してください'),
  password: z
    .string({ required_error: 'パスワードを入力してください' })
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(128),
  termsAccepted: z
    .boolean({ required_error: '利用規約に同意してください' })
    .refine((val) => val === true, '利用規約に同意してください'),
});

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

  // 1. リクエストボディのバリデーション
  const body = await readBody(event);
  const parsed = acceptBodySchema.safeParse(body);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      data: {
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message ?? 'バリデーションエラー',
          details: parsed.error.issues,
        },
      },
    });
  }

  const { name, password } = parsed.data;

  // 2. 招待レコードをテナント情報と一緒に取得
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

  // トークン無効
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

  // 3. Better Auth でユーザー作成（内部 API 呼び出し）
  const signUpResponse = await auth.api.signUpEmail({
    body: {
      name,
      email: inv.email,
      password,
    },
  });

  if (!signUpResponse?.user) {
    throw createError({
      statusCode: 500,
      data: {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'アカウント作成に失敗しました',
        },
      },
    });
  }

  const userId = signUpResponse.user.id;

  // 4. user_tenant INSERT + invitation UPDATE（トランザクション）
  await db.transaction(async (tx) => {
    // user_tenant に INSERT（is_default = true）
    await tx.insert(userTenant).values({
      id: ulid(),
      userId,
      tenantId: inv.tenantId,
      role: inv.role,
      isDefault: true,
    });

    // invitation のステータスを accepted に更新
    await tx
      .update(invitation)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(invitation.id, inv.id));
  });

  // 5. セッション Cookie をセット
  // signUpEmail はセッションを作成して token を返す
  if (signUpResponse.token) {
    setCookie(event, 'better-auth.session_token', signUpResponse.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7日
    });
  }

  // 6. ロール別リダイレクト先を決定
  const role = inv.role as Role;
  const redirectTo = ROLE_REDIRECT_MAP[role] ?? '/app';

  // 7. レスポンス
  setResponseStatus(event, 201);
  return {
    data: {
      user: {
        id: userId,
        email: inv.email,
        name,
      },
      tenant: {
        id: inv.tenantId,
        name: inv.tenantName,
      },
      role: inv.role,
      redirectTo,
    },
  };
});
