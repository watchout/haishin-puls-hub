// NAV-001-002-006 ロール別ナビゲーションメニュー定義
// 仕様書: docs/design/features/common/NAV-001-002-006_navigation.md §6

import type { Role } from '~/types/auth'

// ──────────────────────────────────────
// 型定義
// ──────────────────────────────────────

export interface MenuItem {
  path: string
  label: string
  icon: string
  children?: MenuItem[]
}

// ──────────────────────────────────────
// ロール別メニュー定義 (§6, BR-001)
// ──────────────────────────────────────

export const NAVIGATION_MENUS: Record<Role, MenuItem[]> = {
  system_admin: [
    { path: '/admin/dashboard', label: 'ダッシュボード', icon: 'i-heroicons-home' },
    { path: '/admin/tenants', label: 'テナント管理', icon: 'i-heroicons-building-office' },
    { path: '/admin/users', label: 'ユーザー管理', icon: 'i-heroicons-users' },
    { path: '/admin/ai/prompt-templates', label: 'AIテンプレート', icon: 'i-heroicons-cpu-chip' },
    { path: '/admin/settings', label: 'システム設定', icon: 'i-heroicons-cog-6-tooth' },
  ],

  tenant_admin: [
    { path: '/dashboard', label: 'ダッシュボード', icon: 'i-heroicons-home' },
    { path: '/events', label: 'イベント管理', icon: 'i-heroicons-calendar-days' },
    { path: '/members', label: 'メンバー管理', icon: 'i-heroicons-users' },
    { path: '/venues', label: '会場管理', icon: 'i-heroicons-building-office-2' },
    { path: '/admin/ai/prompt-templates', label: 'AIテンプレート', icon: 'i-heroicons-cpu-chip' },
    { path: '/settings', label: '設定', icon: 'i-heroicons-cog-6-tooth' },
  ],

  organizer: [
    { path: '/dashboard', label: 'ダッシュボード', icon: 'i-heroicons-home' },
    { path: '/events', label: 'イベント管理', icon: 'i-heroicons-calendar-days' },
    { path: '/tasks', label: 'タスク', icon: 'i-heroicons-check-circle' },
    { path: '/notifications', label: '通知', icon: 'i-heroicons-bell' },
  ],

  venue_staff: [
    { path: '/venue/dashboard', label: '拠点ダッシュボード', icon: 'i-heroicons-home' },
    { path: '/venue/events', label: 'イベント一覧', icon: 'i-heroicons-calendar-days' },
    { path: '/venue/rooms', label: '会場管理', icon: 'i-heroicons-building-office-2' },
    { path: '/venue/equipment', label: '機材管理', icon: 'i-heroicons-cube' },
  ],

  streaming_provider: [
    { path: '/streaming/dashboard', label: 'ダッシュボード', icon: 'i-heroicons-home' },
    { path: '/streaming/events', label: '配信予定', icon: 'i-heroicons-video-camera' },
    { path: '/streaming/packages', label: 'パッケージ管理', icon: 'i-heroicons-squares-2x2' },
  ],

  event_planner: [
    { path: '/planner/dashboard', label: 'ダッシュボード', icon: 'i-heroicons-home' },
    { path: '/planner/clients', label: 'クライアント', icon: 'i-heroicons-building-office' },
    { path: '/planner/events', label: 'イベント管理', icon: 'i-heroicons-calendar-days' },
    { path: '/planner/tasks', label: 'タスク', icon: 'i-heroicons-check-circle' },
  ],

  speaker: [
    { path: '/speaker/events', label: 'マイイベント', icon: 'i-heroicons-calendar-days' },
    { path: '/speaker/sessions', label: '登壇情報', icon: 'i-heroicons-microphone' },
    { path: '/speaker/materials', label: '資料管理', icon: 'i-heroicons-document-text' },
  ],

  sales_marketing: [
    { path: '/sales/dashboard', label: 'ダッシュボード', icon: 'i-heroicons-home' },
    { path: '/sales/leads', label: 'リード管理', icon: 'i-heroicons-user-group' },
    { path: '/sales/events', label: 'イベント', icon: 'i-heroicons-calendar-days' },
    { path: '/sales/reports', label: 'レポート', icon: 'i-heroicons-chart-bar' },
  ],

  participant: [], // BR-002: ポータルレイアウト使用（サイドバーなし）

  vendor: [
    { path: '/vendor/events', label: 'イベント', icon: 'i-heroicons-calendar-days' },
    { path: '/vendor/tasks', label: 'タスク', icon: 'i-heroicons-check-circle' },
  ],
}

// ──────────────────────────────────────
// 通知バッジ表示 (§3-F)
// ──────────────────────────────────────

/** 通知カウント表示文字列（99+で打ち止め） */
export function formatNotificationCount(count: number): string {
  if (count <= 0) return ''
  return count > 99 ? '99+' : String(count)
}

// ──────────────────────────────────────
// テナント名の truncate (§3-F)
// ──────────────────────────────────────

/** テナント名を最大30文字で切り詰め */
export function truncateTenantName(name: string, maxLength = 30): string {
  if (name.length <= maxLength) return name
  return `${name.slice(0, maxLength)}...`
}
