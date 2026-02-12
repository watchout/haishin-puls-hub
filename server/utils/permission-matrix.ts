// ROLE-001-004 権限マトリクス
// 仕様書: docs/design/features/common/ROLE-001-004_rbac.md §3 FR-002

import type { Role } from '~/types/auth';

// ──────────────────────────────────────
// アクション・リソース型定義
// ──────────────────────────────────────

/** 権限アクション定義（FR-002） */
export const ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'invite',
  'manage',
] as const;

export type Action = typeof ACTIONS[number];

/** 権限リソース定義（FR-002） */
export const RESOURCES = [
  'tenant',
  'member',
  'event',
  'venue',
  'streaming',
  'task',
  'speaker',
  'participant',
  'ai_chat',
] as const;

export type Resource = typeof RESOURCES[number];

// ──────────────────────────────────────
// 権限マトリクス（FR-002 §3 権限マトリクス表）
// ──────────────────────────────────────

/**
 * ロール×リソースの権限マトリクス
 * manage = 全アクション許可
 */
export const PERMISSION_MATRIX: Record<Role, Record<Resource, Action[]>> = {
  system_admin: {
    tenant: ['manage'],
    member: ['manage'],
    event: ['manage'],
    venue: ['manage'],
    streaming: ['manage'],
    task: ['manage'],
    speaker: ['manage'],
    participant: ['manage'],
    ai_chat: ['manage'],
  },
  tenant_admin: {
    tenant: ['manage'],
    member: ['manage'],
    event: ['manage'],
    venue: ['manage'],
    streaming: ['manage'],
    task: ['manage'],
    speaker: ['manage'],
    participant: ['manage'],
    ai_chat: ['manage'],
  },
  organizer: {
    tenant: ['read'],
    member: ['read'],
    event: ['create', 'read', 'update', 'delete'],
    venue: ['create', 'read', 'update'],
    streaming: ['create', 'read', 'update'],
    task: ['create', 'read', 'update', 'delete'],
    speaker: ['create', 'read', 'update', 'delete'],
    participant: ['read'],
    ai_chat: ['read'],
  },
  venue_staff: {
    tenant: [],
    member: [],
    event: ['read'],
    venue: ['create', 'read', 'update', 'delete'],
    streaming: [],
    task: ['read'],
    speaker: ['read'],
    participant: [],
    ai_chat: ['read'],
  },
  streaming_provider: {
    tenant: [],
    member: [],
    event: ['read'],
    venue: [],
    streaming: ['create', 'read', 'update', 'delete'],
    task: ['read'],
    speaker: ['read'],
    participant: [],
    ai_chat: ['read'],
  },
  event_planner: {
    tenant: [],
    member: [],
    event: ['create', 'read', 'update'],
    venue: ['read'],
    streaming: ['read'],
    task: ['create', 'read', 'update'],
    speaker: ['create', 'read', 'update'],
    participant: ['read'],
    ai_chat: ['read'],
  },
  speaker: {
    tenant: [],
    member: [],
    event: ['read'],
    venue: [],
    streaming: [],
    task: ['read'],
    speaker: ['read', 'update'], // 自分の情報のみ
    participant: [],
    ai_chat: ['read'],
  },
  sales_marketing: {
    tenant: [],
    member: [],
    event: ['read'],
    venue: [],
    streaming: [],
    task: ['read'],
    speaker: ['read'],
    participant: ['read'],
    ai_chat: ['read'],
  },
  participant: {
    tenant: [],
    member: [],
    event: ['read'],
    venue: [],
    streaming: [],
    task: [],
    speaker: [],
    participant: ['read'], // 自分のみ
    ai_chat: ['read'], // 自分のみ
  },
  vendor: {
    tenant: [],
    member: [],
    event: ['read'],
    venue: [],
    streaming: [],
    task: ['read'],
    speaker: ['read'],
    participant: [],
    ai_chat: ['read'],
  },
};

// ──────────────────────────────────────
// 権限チェック関数
// ──────────────────────────────────────

/**
 * 権限チェック（BR-007: manage は全アクション許可）
 * @param role - ユーザーのロール
 * @param action - チェックするアクション
 * @param resource - チェックするリソース
 * @returns 権限があれば true
 */
export function hasPermission(role: Role, action: Action, resource: Resource): boolean {
  const permissions = PERMISSION_MATRIX[role]?.[resource];
  if (!permissions) return false;
  return permissions.includes('manage') || permissions.includes(action);
}

/**
 * ロールの全権限を取得
 * @param role - ユーザーのロール
 * @returns リソースごとの許可アクション一覧
 */
export function getRolePermissions(role: Role): Record<Resource, Action[]> {
  return PERMISSION_MATRIX[role] ?? ({} as Record<Resource, Action[]>);
}
