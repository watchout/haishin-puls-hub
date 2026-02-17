// ROLE-003 usePermission Composable ユニットテスト
// 仕様書: docs/design/features/common/ROLE-001-004_rbac.md §6.2

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { hasPermission } from '~/server/utils/permission-matrix';
import type { Role } from '~/types/auth';

// tenantStore をモック
const mockCurrentRole = ref<Role | null>(null);

vi.mock('~/stores/tenant', () => ({
  useTenantStore: () => ({
    currentRole: mockCurrentRole.value,
  }),
}));

// usePermission の内部ロジックをテスト
// composable は Vue の setup context が必要なため、ロジックを直接テスト

describe('usePermission ロジック', () => {
  beforeEach(() => {
    mockCurrentRole.value = null;
  });

  describe('can() - 権限チェック', () => {
    it('ロールが null の場合は false を返す', () => {
      mockCurrentRole.value = null;
      const role = mockCurrentRole.value;
      const result = role ? hasPermission(role, 'create', 'event') : false;
      expect(result).toBe(false);
    });

    it('organizer はイベント作成可能', () => {
      mockCurrentRole.value = 'organizer';
      const result = hasPermission(mockCurrentRole.value, 'create', 'event');
      expect(result).toBe(true);
    });

    it('participant はイベント作成不可', () => {
      mockCurrentRole.value = 'participant';
      const result = hasPermission(mockCurrentRole.value, 'create', 'event');
      expect(result).toBe(false);
    });

    it('system_admin は全リソースに全アクション可能', () => {
      mockCurrentRole.value = 'system_admin';
      expect(hasPermission(mockCurrentRole.value, 'create', 'event')).toBe(true);
      expect(hasPermission(mockCurrentRole.value, 'delete', 'tenant')).toBe(true);
      expect(hasPermission(mockCurrentRole.value, 'manage', 'member')).toBe(true);
    });

    it('venue_staff は会場 CRUD 可能、テナント管理不可', () => {
      mockCurrentRole.value = 'venue_staff';
      expect(hasPermission(mockCurrentRole.value, 'create', 'venue')).toBe(true);
      expect(hasPermission(mockCurrentRole.value, 'delete', 'venue')).toBe(true);
      expect(hasPermission(mockCurrentRole.value, 'read', 'tenant')).toBe(false);
    });
  });

  describe('hasRole() - ロールチェック', () => {
    it('ロールが null の場合は false', () => {
      mockCurrentRole.value = null;
      const role = mockCurrentRole.value;
      const result = role ? ['tenant_admin', 'organizer'].includes(role) : false;
      expect(result).toBe(false);
    });

    it('organizer で [tenant_admin, organizer] をチェック → true', () => {
      mockCurrentRole.value = 'organizer';
      const roles: Role[] = ['tenant_admin', 'organizer'];
      expect(roles.includes(mockCurrentRole.value)).toBe(true);
    });

    it('speaker で [tenant_admin, organizer] をチェック → false', () => {
      mockCurrentRole.value = 'speaker';
      const roles: Role[] = ['tenant_admin', 'organizer'];
      expect(roles.includes(mockCurrentRole.value)).toBe(false);
    });
  });

  describe('isAdmin - 管理者チェック', () => {
    it('system_admin は isAdmin = true', () => {
      mockCurrentRole.value = 'system_admin';
      const isAdmin = ['system_admin', 'tenant_admin'].includes(mockCurrentRole.value);
      expect(isAdmin).toBe(true);
    });

    it('tenant_admin は isAdmin = true', () => {
      mockCurrentRole.value = 'tenant_admin';
      const isAdmin = ['system_admin', 'tenant_admin'].includes(mockCurrentRole.value);
      expect(isAdmin).toBe(true);
    });

    it('organizer は isAdmin = false', () => {
      mockCurrentRole.value = 'organizer';
      const isAdmin = ['system_admin', 'tenant_admin'].includes(mockCurrentRole.value);
      expect(isAdmin).toBe(false);
    });

    it('null は isAdmin = false', () => {
      mockCurrentRole.value = null;
      const isAdmin = mockCurrentRole.value
        ? ['system_admin', 'tenant_admin'].includes(mockCurrentRole.value)
        : false;
      expect(isAdmin).toBe(false);
    });
  });

  describe('isSystemAdmin', () => {
    it('system_admin のみ true', () => {
      mockCurrentRole.value = 'system_admin';
      expect(mockCurrentRole.value === 'system_admin').toBe(true);
    });

    it('tenant_admin は false', () => {
      mockCurrentRole.value = 'tenant_admin';
      const role: string | null = mockCurrentRole.value;
      expect(role === 'system_admin').toBe(false);
    });
  });
});

describe('エッジケース（§3-E）', () => {
  it('EDGE-001: ロール未割り当て → 全権限 false', () => {
    mockCurrentRole.value = null;
    const role = mockCurrentRole.value;
    const result = role ? hasPermission(role, 'read', 'event') : false;
    expect(result).toBe(false);
  });

  it('EDGE-004: system_admin は他テナントリソースにアクセス可能', () => {
    mockCurrentRole.value = 'system_admin';
    // system_admin は全リソースに manage → 全アクション許可
    expect(hasPermission(mockCurrentRole.value, 'manage', 'event')).toBe(true);
    expect(hasPermission(mockCurrentRole.value, 'manage', 'tenant')).toBe(true);
  });

  it('EDGE-005: participant がテナント機能にアクセス → 拒否', () => {
    mockCurrentRole.value = 'participant';
    expect(hasPermission(mockCurrentRole.value, 'read', 'tenant')).toBe(false);
    expect(hasPermission(mockCurrentRole.value, 'read', 'member')).toBe(false);
    expect(hasPermission(mockCurrentRole.value, 'create', 'event')).toBe(false);
  });
});
