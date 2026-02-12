// NAV-001-002-006 ナビゲーション Composable
// 仕様書: docs/design/features/common/NAV-001-002-006_navigation.md §11

import { NAVIGATION_MENUS } from '~/constants/navigation'
import type { MenuItem } from '~/constants/navigation'
import type { Role } from '~/types/auth'

/**
 * ナビゲーション Composable
 *
 * FR-002: ロールベースメニュー表示
 * FR-003: アクティブメニューハイライト
 * BR-001: ロール別メニューフィルタリング
 * BR-005: アクティブメニューハイライトロジック
 */
export function useNavigation() {
  const route = useRoute()

  /**
   * ロールに応じたメニュー項目を取得 (BR-001)
   * 権限のないメニュー項目は非表示
   */
  function getMenuItems(role: Role | null | undefined): MenuItem[] {
    if (!role) return []
    return NAVIGATION_MENUS[role] ?? []
  }

  /**
   * 現在のルートパスがメニュー項目にマッチするか判定 (BR-005)
   * - 完全一致: `/events` === `/events`
   * - 前方一致: `/events/123` は `/events` にマッチ
   */
  function isActive(path: string): boolean {
    return route.path === path || route.path.startsWith(`${path}/`)
  }

  /**
   * ボトムタブ用メニュー項目を取得（先頭4項目）(§3-F)
   */
  function getBottomTabItems(role: Role | null | undefined): MenuItem[] {
    const items = getMenuItems(role)
    return items.slice(0, 4)
  }

  /**
   * participant ロールかどうか判定 (BR-002)
   * participant はポータルレイアウト（サイドバーなし）を使用
   */
  function isPortalLayout(role: Role | null | undefined): boolean {
    return role === 'participant'
  }

  return {
    getMenuItems,
    isActive,
    getBottomTabItems,
    isPortalLayout,
  }
}
