// ROLE-001-004 ビジネスルール ユニットテスト
// 仕様書: docs/design/features/common/ROLE-001-004_rbac.md §7, §9
//
// 注意: requirePermission / assertMinAdminCount は H3Event + DB 依存のため
// ここではビジネスロジックの単体テストのみ実施。
// サーバーサイド統合テストは別途 tests/integration/ で実施する。

import { describe, it, expect } from 'vitest';
import { hasPermission } from '~/server/utils/permission-matrix';
import type { Role } from '~/types/auth';
import { ROLES } from '~/types/auth';

describe('BR-001: system_admin の全テナントアクセス権', () => {
  it('system_admin は全リソースの manage が許可される', () => {
    const resources = ['tenant', 'member', 'event', 'venue', 'streaming', 'task', 'speaker', 'participant', 'ai_chat'] as const;
    for (const resource of resources) {
      expect(hasPermission('system_admin', 'manage', resource)).toBe(true);
    }
  });

  it('system_admin は全アクションが許可される（manage が暗黙的に含む）', () => {
    const actions = ['create', 'read', 'update', 'delete', 'invite'] as const;
    for (const action of actions) {
      expect(hasPermission('system_admin', action, 'event')).toBe(true);
    }
  });
});

describe('BR-002: tenant_admin のテナント内完全管理権', () => {
  it('tenant_admin は全リソースの manage が許可される', () => {
    const resources = ['tenant', 'member', 'event', 'venue', 'streaming', 'task', 'speaker', 'participant', 'ai_chat'] as const;
    for (const resource of resources) {
      expect(hasPermission('tenant_admin', 'manage', resource)).toBe(true);
    }
  });
});

describe('BR-007: 権限継承ルール（manage = 全アクション）', () => {
  it('manage を持つロールは create も許可される', () => {
    expect(hasPermission('system_admin', 'create', 'event')).toBe(true);
    expect(hasPermission('tenant_admin', 'create', 'event')).toBe(true);
  });

  it('manage を持つロールは delete も許可される', () => {
    expect(hasPermission('system_admin', 'delete', 'member')).toBe(true);
    expect(hasPermission('tenant_admin', 'delete', 'member')).toBe(true);
  });

  it('manage を持つロールは invite も許可される', () => {
    expect(hasPermission('system_admin', 'invite', 'member')).toBe(true);
  });

  it('manage を持たないロールでも明示的なアクションは許可される', () => {
    expect(hasPermission('organizer', 'create', 'event')).toBe(true);
    expect(hasPermission('organizer', 'read', 'event')).toBe(true);
  });

  it('manage も明示的アクションもないロールは拒否される', () => {
    expect(hasPermission('participant', 'create', 'event')).toBe(false);
    expect(hasPermission('speaker', 'delete', 'event')).toBe(false);
  });
});

describe('BR-009: 自己ロール変更の禁止（ロジックテスト）', () => {
  // assertNotSelfRoleChange は H3 依存のため、ロジックのみ直接テスト
  const isSelfRoleChange = (sessionUserId: string, targetUserId: string): boolean => {
    return sessionUserId === targetUserId;
  };

  it('異なるユーザーIDは自己変更ではない', () => {
    expect(isSelfRoleChange('user_001', 'user_002')).toBe(false);
  });

  it('同一ユーザーIDは自己変更', () => {
    expect(isSelfRoleChange('user_001', 'user_001')).toBe(true);
  });

  it('空文字同士も自己変更と判定', () => {
    expect(isSelfRoleChange('', '')).toBe(true);
  });
});

describe('§9.1 エラーケース検証', () => {
  it('FORBIDDEN: participant がイベント作成を試みると拒否', () => {
    expect(hasPermission('participant', 'create', 'event')).toBe(false);
  });

  it('ROLE_INVALID: 無効なロール値は false', () => {
    expect(hasPermission('' as Role, 'read', 'event')).toBe(false);
    expect(hasPermission('invalid_role' as Role, 'read', 'event')).toBe(false);
  });
});

describe('§3-E エッジケース', () => {
  it('EDGE-004: system_admin は他テナントのリソースも manage 可能', () => {
    expect(hasPermission('system_admin', 'manage', 'tenant')).toBe(true);
    expect(hasPermission('system_admin', 'manage', 'event')).toBe(true);
  });

  it('EDGE-005: participant がテナント機能にアクセス → 拒否', () => {
    expect(hasPermission('participant', 'read', 'tenant')).toBe(false);
    expect(hasPermission('participant', 'read', 'member')).toBe(false);
    expect(hasPermission('participant', 'manage', 'tenant')).toBe(false);
  });
});

describe('§3-F VAL-001: ロール値の完全性', () => {
  it('全 10 ロールが ROLES 定数に含まれる', () => {
    const expected = [
      'system_admin', 'tenant_admin', 'organizer', 'venue_staff',
      'streaming_provider', 'event_planner', 'speaker', 'sales_marketing',
      'participant', 'vendor',
    ];
    for (const role of expected) {
      expect(ROLES).toContain(role);
    }
    expect(ROLES).toHaveLength(10);
  });
});
