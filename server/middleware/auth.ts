// ROLE-004 認証ミドルウェア
// 仕様書: docs/design/features/common/ROLE-001-004_rbac.md §3 FR-004
//
// 全APIリクエストでセッションを検証し、event.context.auth にロール情報をセットする。
// 権限チェック自体は各エンドポイントで requirePermission() を呼ぶ。

import { getAuthSession } from '../utils/permission';
import { db } from '../utils/db';
import { eq, and } from 'drizzle-orm';
import { userTenant } from '../database/schema/user-tenant';
import type { Role } from '~/types/auth';
import type { AuthContext } from '../utils/permission';

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname;

  // Better Auth のエンドポイントはスキップ（自前で認証処理するため）
  if (path.startsWith('/api/auth/')) return;

  // ヘルスチェックはスキップ
  if (path === '/api/health') return;

  // API以外のリクエストはスキップ
  if (!path.startsWith('/api/')) return;

  // セッション取得を試みる
  const session = await getAuthSession(event);
  if (!session?.user) return; // 未認証は各エンドポイントでハンドリング

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

  // event.context.auth にセット
  const authContext: AuthContext = {
    userId: session.user.id,
    tenantId: membership[0]?.tenantId ?? '',
    role: (membership[0]?.role as Role) ?? 'participant',
  };

  event.context.auth = authContext;
});
