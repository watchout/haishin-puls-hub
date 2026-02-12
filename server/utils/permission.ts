// ROLE-004 バックエンド権限チェック
// 仕様書: docs/design/features/common/ROLE-001-004_rbac.md §3 FR-004, FR-006

import type { H3Event } from 'h3';
import { createError } from 'h3';
import { auth } from './auth';
import { db } from './db';
import { eq, and } from 'drizzle-orm';
import { userTenant } from '../database/schema/user-tenant';
import { hasPermission } from './permission-matrix';
import type { Action, Resource } from './permission-matrix';
import type { Role } from '~/types/auth';

// ──────────────────────────────────────
// 型定義
// ──────────────────────────────────────

/** event.context.auth に格納する認証情報 */
export interface AuthContext {
  userId: string;
  tenantId: string;
  role: Role;
}

// ──────────────────────────────────────
// セッション取得
// ──────────────────────────────────────

/**
 * Better Auth セッションからユーザー情報を取得
 * セッションがない場合は null を返す
 */
export async function getAuthSession(event: H3Event) {
  try {
    const session = await auth.api.getSession({ headers: event.headers });
    return session;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────
// 権限チェック関数（FR-006 §3）
// ──────────────────────────────────────

/**
 * API エンドポイントの権限チェック
 *
 * 検証レイヤー（§3 FR-006）:
 * 1. 認証チェック: セッション有効性確認
 * 2. ロールチェック: テナントメンバーシップ確認
 * 3. 権限チェック: アクション・リソース権限確認
 * 4. オーナーシップチェック: リソース所有権確認（必要に応じて）
 *
 * @param event - H3 イベント
 * @param action - 必要なアクション
 * @param resource - 対象リソース
 * @param resourceOwnerId - リソースオーナーのID（オーナーシップチェック時）
 * @throws 401 セッションなし / 403 権限不足
 */
export async function requirePermission(
  event: H3Event,
  action: Action,
  resource: Resource,
  resourceOwnerId?: string,
): Promise<AuthContext> {
  // 1. 認証チェック
  const authContext = event.context.auth as AuthContext | undefined;
  if (!authContext) {
    // middleware で設定されていない場合、セッションから取得を試みる
    const session = await getAuthSession(event);
    if (!session?.user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'AUTH_REQUIRED',
        message: '認証が必要です',
      });
    }

    // テナント情報を取得
    const membership = await db
      .select({
        tenantId: userTenant.tenantId,
        role: userTenant.role,
      })
      .from(userTenant)
      .where(
        and(
          eq(userTenant.userId, session.user.id),
          eq(userTenant.isDefault, true),
        ),
      )
      .limit(1);

    if (membership.length === 0) {
      throw createError({
        statusCode: 403,
        statusMessage: 'NO_TENANT',
        message: '所属するテナントがありません',
      });
    }

    // event.context.auth にセット
    const m = membership[0]!;
    event.context.auth = {
      userId: session.user.id,
      tenantId: m.tenantId,
      role: m.role as Role,
    };
  }

  const ctx = event.context.auth as AuthContext;

  // 2. system_admin は全権限（BR-001）
  if (ctx.role === 'system_admin') {
    return ctx;
  }

  // 3. 権限マトリクスチェック（BR-007: manage = 全アクション）
  if (!hasPermission(ctx.role, action, resource)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'FORBIDDEN',
      message: `権限がありません: ${action} on ${resource}`,
      data: {
        action,
        resource,
        role: ctx.role,
      },
    });
  }

  // 4. オーナーシップチェック（必要に応じて）
  if (resourceOwnerId && ctx.userId !== resourceOwnerId) {
    throw createError({
      statusCode: 403,
      statusMessage: 'OWNER_MISMATCH',
      message: 'このリソースへのアクセス権限がありません',
    });
  }

  return ctx;
}

/**
 * 認証のみ必須（権限チェックなし）
 * @param event - H3 イベント
 * @throws 401 セッションなし
 */
export async function requireAuth(event: H3Event): Promise<AuthContext> {
  const authContext = event.context.auth as AuthContext | undefined;
  if (authContext) {
    return authContext;
  }

  const session = await getAuthSession(event);
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'AUTH_REQUIRED',
      message: '認証が必要です',
    });
  }

  // テナント情報を取得
  const membership = await db
    .select({
      tenantId: userTenant.tenantId,
      role: userTenant.role,
    })
    .from(userTenant)
    .where(
      and(
        eq(userTenant.userId, session.user.id),
        eq(userTenant.isDefault, true),
      ),
    )
    .limit(1);

  const ctx: AuthContext = {
    userId: session.user.id,
    tenantId: membership[0]?.tenantId ?? '',
    role: (membership[0]?.role as Role) ?? 'participant',
  };

  event.context.auth = ctx;
  return ctx;
}

// ──────────────────────────────────────
// ビジネスルール検証（§7）
// ──────────────────────────────────────

/**
 * 自己ロール変更の禁止チェック（BR-009）
 * @param sessionUserId - 操作者のユーザーID
 * @param targetUserId - 変更対象のユーザーID
 * @throws 400 自己変更
 */
export function assertNotSelfRoleChange(sessionUserId: string, targetUserId: string): void {
  if (sessionUserId === targetUserId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'SELF_ROLE_CHANGE',
      message: '自分自身のロールは変更できません',
    });
  }
}

/**
 * 最低管理者数チェック（BR-008）
 * @param tenantId - テナントID
 * @throws 400 最後の管理者
 */
export async function assertMinAdminCount(tenantId: string): Promise<void> {
  const admins = await db
    .select({ userId: userTenant.userId })
    .from(userTenant)
    .where(
      and(
        eq(userTenant.tenantId, tenantId),
        eq(userTenant.role, 'tenant_admin'),
      ),
    );

  if (admins.length <= 1) {
    throw createError({
      statusCode: 400,
      statusMessage: 'LAST_ADMIN',
      message: '最低1名の管理者が必要です',
    });
  }
}
