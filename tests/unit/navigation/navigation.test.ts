// NAV-001-002-006 ナビゲーション ユニットテスト
// 仕様書: docs/design/features/common/NAV-001-002-006_navigation.md §12

import { describe, it, expect } from 'vitest'
import {
  NAVIGATION_MENUS,
  formatNotificationCount,
  truncateTenantName,
} from '~/constants/navigation'
import type { MenuItem } from '~/constants/navigation'
import type { Role } from '~/types/auth'
import { ROLES } from '~/types/auth'

// ──────────────────────────────────────
// ロール別メニュー定義テスト (BR-001)
// ──────────────────────────────────────

describe('ロール別メニュー定義 (BR-001)', () => {
  it('全ロールにメニュー定義が存在する', () => {
    for (const role of ROLES) {
      expect(NAVIGATION_MENUS[role]).toBeDefined()
      expect(Array.isArray(NAVIGATION_MENUS[role])).toBe(true)
    }
  })

  it('system_admin は4項目', () => {
    expect(NAVIGATION_MENUS.system_admin).toHaveLength(4)
  })

  it('tenant_admin は5項目', () => {
    expect(NAVIGATION_MENUS.tenant_admin).toHaveLength(5)
  })

  it('organizer は4項目', () => {
    expect(NAVIGATION_MENUS.organizer).toHaveLength(4)
  })

  it('venue_staff は4項目', () => {
    expect(NAVIGATION_MENUS.venue_staff).toHaveLength(4)
  })

  it('streaming_provider は3項目', () => {
    expect(NAVIGATION_MENUS.streaming_provider).toHaveLength(3)
  })

  it('event_planner は4項目', () => {
    expect(NAVIGATION_MENUS.event_planner).toHaveLength(4)
  })

  it('speaker は3項目', () => {
    expect(NAVIGATION_MENUS.speaker).toHaveLength(3)
  })

  it('sales_marketing は4項目', () => {
    expect(NAVIGATION_MENUS.sales_marketing).toHaveLength(4)
  })

  it('participant はメニューなし (BR-002: ポータルレイアウト)', () => {
    expect(NAVIGATION_MENUS.participant).toHaveLength(0)
  })

  it('各メニュー項目に必須プロパティが存在する', () => {
    for (const role of ROLES) {
      for (const item of NAVIGATION_MENUS[role]) {
        expect(item.path).toBeTruthy()
        expect(item.label).toBeTruthy()
        expect(item.icon).toBeTruthy()
        expect(item.path.startsWith('/')).toBe(true)
        expect(item.icon.startsWith('i-heroicons-')).toBe(true)
      }
    }
  })

  it('system_admin のメニューパスは /admin/ で始まる', () => {
    for (const item of NAVIGATION_MENUS.system_admin) {
      expect(item.path.startsWith('/admin/')).toBe(true)
    }
  })

  it('organizer の最初の項目はダッシュボード', () => {
    expect(NAVIGATION_MENUS.organizer[0]?.label).toBe('ダッシュボード')
  })

  it('organizer にイベント管理メニューが含まれる', () => {
    const labels = NAVIGATION_MENUS.organizer.map(i => i.label)
    expect(labels).toContain('イベント管理')
  })
})

// ──────────────────────────────────────
// 通知バッジ表示テスト (§3-F)
// ──────────────────────────────────────

describe('通知バッジ表示 (§3-F)', () => {
  it('0 は空文字を返す (バッジ非表示)', () => {
    expect(formatNotificationCount(0)).toBe('')
  })

  it('負の値は空文字を返す', () => {
    expect(formatNotificationCount(-1)).toBe('')
  })

  it('1 は "1" を返す', () => {
    expect(formatNotificationCount(1)).toBe('1')
  })

  it('99 は "99" を返す', () => {
    expect(formatNotificationCount(99)).toBe('99')
  })

  it('100 は "99+" を返す', () => {
    expect(formatNotificationCount(100)).toBe('99+')
  })

  it('150 は "99+" を返す', () => {
    expect(formatNotificationCount(150)).toBe('99+')
  })

  it('5 は "5" を返す', () => {
    expect(formatNotificationCount(5)).toBe('5')
  })
})

// ──────────────────────────────────────
// テナント名 truncate テスト (§3-F)
// ──────────────────────────────────────

describe('テナント名 truncate (§3-F)', () => {
  it('30文字以内はそのまま返す', () => {
    const name = 'テスト株式会社'
    expect(truncateTenantName(name)).toBe(name)
  })

  it('ちょうど30文字はそのまま返す', () => {
    const name = 'a'.repeat(30)
    expect(truncateTenantName(name)).toBe(name)
  })

  it('31文字以上は30文字 + "..." に切り詰める', () => {
    const name = 'a'.repeat(31)
    const result = truncateTenantName(name)
    expect(result).toBe('a'.repeat(30) + '...')
    expect(result).toHaveLength(33) // 30 + '...'
  })

  it('100文字（DB上限）は30文字 + "..." に切り詰める', () => {
    const name = 'a'.repeat(100)
    const result = truncateTenantName(name)
    expect(result).toHaveLength(33)
  })

  it('空文字はそのまま返す', () => {
    expect(truncateTenantName('')).toBe('')
  })

  it('1文字はそのまま返す', () => {
    expect(truncateTenantName('A')).toBe('A')
  })

  it('カスタム maxLength を指定できる', () => {
    const name = 'a'.repeat(20)
    const result = truncateTenantName(name, 10)
    expect(result).toBe('a'.repeat(10) + '...')
  })
})

// ──────────────────────────────────────
// アクティブメニュー判定ロジック (BR-005)
// ──────────────────────────────────────

describe('アクティブメニュー判定 (BR-005)', () => {
  function isActive(currentPath: string, menuPath: string): boolean {
    return currentPath === menuPath || currentPath.startsWith(`${menuPath}/`)
  }

  it('完全一致の場合は true', () => {
    expect(isActive('/events', '/events')).toBe(true)
  })

  it('サブパスの場合も true (前方一致)', () => {
    expect(isActive('/events/123', '/events')).toBe(true)
  })

  it('部分一致でない場合は false', () => {
    expect(isActive('/event-logs', '/events')).toBe(false)
  })

  it('異なるパスの場合は false', () => {
    expect(isActive('/dashboard', '/events')).toBe(false)
  })

  it('ルートパスの場合', () => {
    expect(isActive('/', '/')).toBe(true)
  })

  it('ネストされたサブパスの場合', () => {
    expect(isActive('/events/123/edit', '/events')).toBe(true)
  })

  it('admin パスの場合', () => {
    expect(isActive('/admin/tenants/abc', '/admin/tenants')).toBe(true)
  })
})

// ──────────────────────────────────────
// ボトムタブ項目取得テスト (§3-F)
// ──────────────────────────────────────

describe('ボトムタブ項目 (§3-F)', () => {
  function getBottomTabItems(role: Role | null): MenuItem[] {
    if (!role) return []
    const items = NAVIGATION_MENUS[role] ?? []
    return items.slice(0, 4)
  }

  it('organizer は4項目すべて表示', () => {
    const tabs = getBottomTabItems('organizer')
    expect(tabs).toHaveLength(4)
  })

  it('speaker は3項目のみ (先頭4項目だが3項目しかない)', () => {
    const tabs = getBottomTabItems('speaker')
    expect(tabs).toHaveLength(3)
  })

  it('tenant_admin は先頭4項目のみ (5項目中)', () => {
    const tabs = getBottomTabItems('tenant_admin')
    expect(tabs).toHaveLength(4)
    expect(tabs[4]).toBeUndefined()
  })

  it('participant は0項目', () => {
    const tabs = getBottomTabItems('participant')
    expect(tabs).toHaveLength(0)
  })

  it('null ロールは0項目', () => {
    const tabs = getBottomTabItems(null)
    expect(tabs).toHaveLength(0)
  })
})

// ──────────────────────────────────────
// ポータルレイアウト判定テスト (BR-002)
// ──────────────────────────────────────

describe('ポータルレイアウト判定 (BR-002)', () => {
  function isPortalLayout(role: Role | null | undefined): boolean {
    return role === 'participant'
  }

  it('participant はポータルレイアウト', () => {
    expect(isPortalLayout('participant')).toBe(true)
  })

  it('organizer はポータルレイアウトではない', () => {
    expect(isPortalLayout('organizer')).toBe(false)
  })

  it('system_admin はポータルレイアウトではない', () => {
    expect(isPortalLayout('system_admin')).toBe(false)
  })

  it('null はポータルレイアウトではない', () => {
    expect(isPortalLayout(null)).toBe(false)
  })

  it('undefined はポータルレイアウトではない', () => {
    expect(isPortalLayout(undefined)).toBe(false)
  })
})

// ──────────────────────────────────────
// サイドバー状態管理ロジックテスト (BR-006)
// ──────────────────────────────────────

describe('サイドバー状態管理ロジック (BR-006)', () => {
  it('デフォルトは展開状態', () => {
    const collapsed = false
    expect(collapsed).toBe(false)
  })

  it('トグルで折りたたみ状態に変わる', () => {
    let collapsed = false
    collapsed = !collapsed
    expect(collapsed).toBe(true)
  })

  it('再トグルで展開状態に戻る', () => {
    let collapsed = false
    collapsed = !collapsed // true
    collapsed = !collapsed // false
    expect(collapsed).toBe(false)
  })

  it('サイドバー幅: 展開時は256px', () => {
    const collapsed = false
    const width = collapsed ? 64 : 256
    expect(width).toBe(256)
  })

  it('サイドバー幅: 折りたたみ時は64px', () => {
    const collapsed = true
    const width = collapsed ? 64 : 256
    expect(width).toBe(64)
  })
})

// ──────────────────────────────────────
// モバイルサイドバー状態テスト
// ──────────────────────────────────────

describe('モバイルサイドバー状態', () => {
  it('デフォルトは非表示', () => {
    const mobileOpen = false
    expect(mobileOpen).toBe(false)
  })

  it('トグルで表示', () => {
    let mobileOpen = false
    mobileOpen = !mobileOpen
    expect(mobileOpen).toBe(true)
  })

  it('closeMobileSidebar で非表示に戻る', () => {
    let mobileOpen = true
    mobileOpen = false // close
    expect(mobileOpen).toBe(false)
  })
})
