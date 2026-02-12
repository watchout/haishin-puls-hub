// ROLE-003 フロントエンド権限チェック Composable
// 仕様書: docs/design/features/common/ROLE-001-004_rbac.md §6.2

import { useTenantStore } from '~/stores/tenant';
import { hasPermission } from '~/server/utils/permission-matrix';
import type { Action, Resource } from '~/server/utils/permission-matrix';
import type { Role } from '~/types/auth';

/**
 * 権限チェック Composable（FR-003）
 *
 * 使用例:
 * ```vue
 * const { can, hasRole, isAdmin } = usePermission()
 *
 * // v-if="can('create', 'event')" でUI制御
 * // v-if="hasRole('tenant_admin', 'organizer')" でロール別表示
 * // v-if="isAdmin" で管理者チェック
 * ```
 */
export function usePermission() {
  const tenantStore = useTenantStore();

  /** 現在のロール（リアクティブ） */
  const currentRole = computed<Role | null>(() => {
    return tenantStore.currentRole;
  });

  /**
   * 権限チェック
   * @param action - アクション (create, read, update, delete, invite, manage)
   * @param resource - リソース (event, venue, task, etc.)
   * @returns 権限があれば true
   */
  const can = (action: Action, resource: Resource): boolean => {
    if (!currentRole.value) return false;
    return hasPermission(currentRole.value, action, resource);
  };

  /**
   * ロールチェック
   * @param roles - チェックするロール（複数可）
   * @returns いずれかのロールを持っていれば true
   */
  const hasRoleFn = (...roles: Role[]): boolean => {
    if (!currentRole.value) return false;
    return roles.includes(currentRole.value);
  };

  /**
   * 管理者チェック
   * system_admin または tenant_admin であれば true
   */
  const isAdmin = computed(() => {
    return hasRoleFn('system_admin', 'tenant_admin');
  });

  /**
   * システム管理者チェック
   */
  const isSystemAdmin = computed(() => {
    return currentRole.value === 'system_admin';
  });

  return {
    can,
    hasRole: hasRoleFn,
    isAdmin,
    isSystemAdmin,
    currentRole,
  };
}
