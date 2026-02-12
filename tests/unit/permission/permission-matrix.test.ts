// ROLE-001-004 権限マトリクス ユニットテスト
// 仕様書: docs/design/features/common/ROLE-001-004_rbac.md §10.1

import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  getRolePermissions,
  PERMISSION_MATRIX,
  ACTIONS,
  RESOURCES,
} from '~/server/utils/permission-matrix';
import type { Action } from '~/server/utils/permission-matrix';
import type { Role } from '~/types/auth';
import { ROLES } from '~/types/auth';

// ──────────────────────────────────────
// 定数の完全性テスト
// ──────────────────────────────────────

describe('権限マトリクス定数', () => {
  it('6つのアクションが定義されている', () => {
    expect(ACTIONS).toHaveLength(6);
    expect(ACTIONS).toContain('create');
    expect(ACTIONS).toContain('read');
    expect(ACTIONS).toContain('update');
    expect(ACTIONS).toContain('delete');
    expect(ACTIONS).toContain('invite');
    expect(ACTIONS).toContain('manage');
  });

  it('9つのリソースが定義されている', () => {
    expect(RESOURCES).toHaveLength(9);
    expect(RESOURCES).toContain('tenant');
    expect(RESOURCES).toContain('member');
    expect(RESOURCES).toContain('event');
    expect(RESOURCES).toContain('venue');
    expect(RESOURCES).toContain('streaming');
    expect(RESOURCES).toContain('task');
    expect(RESOURCES).toContain('speaker');
    expect(RESOURCES).toContain('participant');
    expect(RESOURCES).toContain('ai_chat');
  });

  it('全ロールの権限マトリクスが定義されている', () => {
    for (const role of ROLES) {
      expect(PERMISSION_MATRIX[role]).toBeDefined();
    }
  });

  it('全ロールの全リソースに権限が定義されている', () => {
    for (const role of ROLES) {
      for (const resource of RESOURCES) {
        expect(PERMISSION_MATRIX[role][resource]).toBeDefined();
        expect(Array.isArray(PERMISSION_MATRIX[role][resource])).toBe(true);
      }
    }
  });
});

// ──────────────────────────────────────
// ROLE-TC-001: system_admin 全権限テスト
// ──────────────────────────────────────

describe('system_admin（ROLE-TC-001）', () => {
  it('全リソースに manage 権限を持つ', () => {
    for (const resource of RESOURCES) {
      expect(PERMISSION_MATRIX.system_admin[resource]).toContain('manage');
    }
  });

  it('全リソースの全アクションが許可される', () => {
    const actions: Action[] = ['create', 'read', 'update', 'delete', 'invite', 'manage'];
    for (const resource of RESOURCES) {
      for (const action of actions) {
        expect(hasPermission('system_admin', action, resource)).toBe(true);
      }
    }
  });
});

// ──────────────────────────────────────
// ROLE-TC-002: tenant_admin 管理権限テスト
// ──────────────────────────────────────

describe('tenant_admin（ROLE-TC-002）', () => {
  it('全リソースに manage 権限を持つ', () => {
    for (const resource of RESOURCES) {
      expect(PERMISSION_MATRIX.tenant_admin[resource]).toContain('manage');
    }
  });

  it('全リソースの全アクションが許可される', () => {
    const actions: Action[] = ['create', 'read', 'update', 'delete', 'invite', 'manage'];
    for (const resource of RESOURCES) {
      for (const action of actions) {
        expect(hasPermission('tenant_admin', action, resource)).toBe(true);
      }
    }
  });
});

// ──────────────────────────────────────
// organizer テスト
// ──────────────────────────────────────

describe('organizer', () => {
  it('イベント作成が可能（ROLE-TC-003 前提）', () => {
    expect(hasPermission('organizer', 'create', 'event')).toBe(true);
  });

  it('イベント CRUD が全て可能', () => {
    expect(hasPermission('organizer', 'create', 'event')).toBe(true);
    expect(hasPermission('organizer', 'read', 'event')).toBe(true);
    expect(hasPermission('organizer', 'update', 'event')).toBe(true);
    expect(hasPermission('organizer', 'delete', 'event')).toBe(true);
  });

  it('会場は作成・閲覧・更新のみ（削除不可）', () => {
    expect(hasPermission('organizer', 'create', 'venue')).toBe(true);
    expect(hasPermission('organizer', 'read', 'venue')).toBe(true);
    expect(hasPermission('organizer', 'update', 'venue')).toBe(true);
    expect(hasPermission('organizer', 'delete', 'venue')).toBe(false);
  });

  it('テナント管理は閲覧のみ', () => {
    expect(hasPermission('organizer', 'read', 'tenant')).toBe(true);
    expect(hasPermission('organizer', 'create', 'tenant')).toBe(false);
    expect(hasPermission('organizer', 'update', 'tenant')).toBe(false);
    expect(hasPermission('organizer', 'delete', 'tenant')).toBe(false);
    expect(hasPermission('organizer', 'manage', 'tenant')).toBe(false);
  });
});

// ──────────────────────────────────────
// venue_staff テスト
// ──────────────────────────────────────

describe('venue_staff', () => {
  it('会場 CRUD が全て可能', () => {
    expect(hasPermission('venue_staff', 'create', 'venue')).toBe(true);
    expect(hasPermission('venue_staff', 'read', 'venue')).toBe(true);
    expect(hasPermission('venue_staff', 'update', 'venue')).toBe(true);
    expect(hasPermission('venue_staff', 'delete', 'venue')).toBe(true);
  });

  it('イベントは閲覧のみ', () => {
    expect(hasPermission('venue_staff', 'read', 'event')).toBe(true);
    expect(hasPermission('venue_staff', 'create', 'event')).toBe(false);
  });

  it('テナント管理権限なし', () => {
    expect(hasPermission('venue_staff', 'read', 'tenant')).toBe(false);
    expect(hasPermission('venue_staff', 'manage', 'tenant')).toBe(false);
  });
});

// ──────────────────────────────────────
// streaming_provider テスト
// ──────────────────────────────────────

describe('streaming_provider', () => {
  it('配信 CRUD が全て可能', () => {
    expect(hasPermission('streaming_provider', 'create', 'streaming')).toBe(true);
    expect(hasPermission('streaming_provider', 'read', 'streaming')).toBe(true);
    expect(hasPermission('streaming_provider', 'update', 'streaming')).toBe(true);
    expect(hasPermission('streaming_provider', 'delete', 'streaming')).toBe(true);
  });

  it('会場は権限なし', () => {
    expect(hasPermission('streaming_provider', 'read', 'venue')).toBe(false);
  });
});

// ──────────────────────────────────────
// speaker テスト
// ──────────────────────────────────────

describe('speaker', () => {
  it('テナント管理不可（ROLE-TC仕様）', () => {
    expect(hasPermission('speaker', 'manage', 'tenant')).toBe(false);
  });

  it('イベントは閲覧のみ', () => {
    expect(hasPermission('speaker', 'read', 'event')).toBe(true);
    expect(hasPermission('speaker', 'create', 'event')).toBe(false);
  });

  it('タスクは閲覧のみ', () => {
    expect(hasPermission('speaker', 'read', 'task')).toBe(true);
    expect(hasPermission('speaker', 'create', 'task')).toBe(false);
  });
});

// ──────────────────────────────────────
// participant テスト（ROLE-TC-004 前提）
// ──────────────────────────────────────

describe('participant', () => {
  it('イベントは閲覧のみ', () => {
    expect(hasPermission('participant', 'read', 'event')).toBe(true);
    expect(hasPermission('participant', 'create', 'event')).toBe(false);
  });

  it('自分の参加者情報は閲覧可能', () => {
    expect(hasPermission('participant', 'read', 'participant')).toBe(true);
    expect(hasPermission('participant', 'update', 'participant')).toBe(false);
  });

  it('AI会話は閲覧可能', () => {
    expect(hasPermission('participant', 'read', 'ai_chat')).toBe(true);
    expect(hasPermission('participant', 'create', 'ai_chat')).toBe(false);
  });

  it('タスク操作不可', () => {
    expect(hasPermission('participant', 'read', 'task')).toBe(false);
    expect(hasPermission('participant', 'create', 'task')).toBe(false);
  });

  it('テナント・メンバー管理不可', () => {
    expect(hasPermission('participant', 'read', 'tenant')).toBe(false);
    expect(hasPermission('participant', 'read', 'member')).toBe(false);
  });
});

// ──────────────────────────────────────
// vendor テスト
// ──────────────────────────────────────

describe('vendor', () => {
  it('イベント閲覧可能', () => {
    expect(hasPermission('vendor', 'read', 'event')).toBe(true);
  });

  it('タスク閲覧可能', () => {
    expect(hasPermission('vendor', 'read', 'task')).toBe(true);
  });

  it('テナント管理不可', () => {
    expect(hasPermission('vendor', 'manage', 'tenant')).toBe(false);
  });
});

// ──────────────────────────────────────
// hasPermission 関数テスト（BR-007）
// ──────────────────────────────────────

describe('hasPermission (BR-007: manage は全アクション許可)', () => {
  it('manage を持つロールは create が許可される', () => {
    expect(hasPermission('system_admin', 'create', 'event')).toBe(true);
    expect(hasPermission('tenant_admin', 'create', 'event')).toBe(true);
  });

  it('manage を持つロールは delete が許可される', () => {
    expect(hasPermission('system_admin', 'delete', 'tenant')).toBe(true);
    expect(hasPermission('tenant_admin', 'delete', 'tenant')).toBe(true);
  });

  it('権限のないロールは false を返す', () => {
    expect(hasPermission('participant', 'create', 'event')).toBe(false);
    expect(hasPermission('speaker', 'delete', 'event')).toBe(false);
  });

  it('存在しないロールは false を返す', () => {
    // TypeScript ではコンパイルエラーだが、ランタイムでの安全性テスト
    expect(hasPermission('nonexistent' as Role, 'read', 'event')).toBe(false);
  });
});

// ──────────────────────────────────────
// getRolePermissions テスト
// ──────────────────────────────────────

describe('getRolePermissions', () => {
  it('ロールの全権限を取得できる', () => {
    const permissions = getRolePermissions('organizer');
    expect(permissions.event).toEqual(['create', 'read', 'update', 'delete']);
    expect(permissions.tenant).toEqual(['read']);
  });

  it('存在しないロールは空オブジェクトを返す', () => {
    const permissions = getRolePermissions('nonexistent' as Role);
    expect(permissions).toEqual({});
  });
});

// ──────────────────────────────────────
// event_planner テスト
// ──────────────────────────────────────

describe('event_planner', () => {
  it('イベント作成・閲覧・更新が可能（削除不可）', () => {
    expect(hasPermission('event_planner', 'create', 'event')).toBe(true);
    expect(hasPermission('event_planner', 'read', 'event')).toBe(true);
    expect(hasPermission('event_planner', 'update', 'event')).toBe(true);
    expect(hasPermission('event_planner', 'delete', 'event')).toBe(false);
  });

  it('会場は閲覧のみ', () => {
    expect(hasPermission('event_planner', 'read', 'venue')).toBe(true);
    expect(hasPermission('event_planner', 'create', 'venue')).toBe(false);
  });
});

// ──────────────────────────────────────
// sales_marketing テスト
// ──────────────────────────────────────

describe('sales_marketing', () => {
  it('参加者閲覧が可能', () => {
    expect(hasPermission('sales_marketing', 'read', 'participant')).toBe(true);
  });

  it('イベントは閲覧のみ', () => {
    expect(hasPermission('sales_marketing', 'read', 'event')).toBe(true);
    expect(hasPermission('sales_marketing', 'create', 'event')).toBe(false);
  });
});
