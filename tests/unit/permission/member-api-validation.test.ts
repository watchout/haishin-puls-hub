// ROLE-001-004 メンバー管理API バリデーションテスト
// 仕様書: docs/design/features/common/ROLE-001-004_rbac.md §5.2, §7

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ROLES } from '~/types/auth';

// メンバーロール変更のバリデーションスキーマ（APIと同じ）
const updateRoleSchema = z.object({
  role: z.enum(ROLES).refine(
    (val) => val !== 'system_admin',
    { message: 'system_admin は招待で付与できません' },
  ),
});

describe('ロール変更バリデーション（§3-F VAL-001〜005）', () => {
  describe('VAL-001: ロール値は enum 値のみ許可', () => {
    it('有効なロール値は成功', () => {
      const validRoles = [
        'tenant_admin',
        'organizer',
        'venue_staff',
        'streaming_provider',
        'event_planner',
        'speaker',
        'sales_marketing',
        'participant',
        'vendor',
      ];

      for (const role of validRoles) {
        const result = updateRoleSchema.safeParse({ role });
        expect(result.success, `${role} は有効であるべき`).toBe(true);
      }
    });

    it('無効なロール値はエラー', () => {
      const invalidRoles = ['admin', 'superuser', '', 'ORGANIZER', 'Manager'];

      for (const role of invalidRoles) {
        const result = updateRoleSchema.safeParse({ role });
        expect(result.success, `${role} は無効であるべき`).toBe(false);
      }
    });
  });

  describe('system_admin は招待で付与不可', () => {
    it('system_admin ロールはバリデーションエラー', () => {
      const result = updateRoleSchema.safeParse({ role: 'system_admin' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toBe('system_admin は招待で付与できません');
      }
    });
  });

  describe('role フィールド必須', () => {
    it('role が未指定はエラー', () => {
      const result = updateRoleSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('role が null はエラー', () => {
      const result = updateRoleSchema.safeParse({ role: null });
      expect(result.success).toBe(false);
    });
  });
});

describe('ROLES 定数の完全性', () => {
  it('10ロールが定義されている', () => {
    expect(ROLES).toHaveLength(10);
  });

  it('全ロールが一意', () => {
    const uniqueRoles = new Set(ROLES);
    expect(uniqueRoles.size).toBe(ROLES.length);
  });

  it('必須ロールが全て含まれる', () => {
    const requiredRoles = [
      'system_admin',
      'tenant_admin',
      'organizer',
      'venue_staff',
      'streaming_provider',
      'event_planner',
      'speaker',
      'sales_marketing',
      'participant',
      'vendor',
    ];
    for (const role of requiredRoles) {
      expect(ROLES).toContain(role);
    }
  });
});
