# NAV-001-002-006: ナビゲーション（ヘッダー・サイドバー・モバイル）

## §1 メタ情報

| 項目 | 内容 |
|------|------|
| 機能ID | NAV-001, NAV-002, NAV-006 |
| 機能名 | ナビゲーション（ヘッダー・サイドバー・モバイル） |
| ステータス | draft |
| 優先度 | MUST |
| 影響範囲 | 全認証済みページ |
| 依存機能 | AUTH-001 (ログイン), AUTH-002 (セッション管理), EVT-050 (AIアシスタント) |
| 関連SSOT | SSOT-2_UI_STATE.md (Layout), SSOT-4_DATA_MODEL.md (User, Tenant) |
| 作成日 | 2026-02-09 |
| 更新日 | 2026-02-09 |

---

## §2 目的・背景

### 目的

ロール別の直感的なナビゲーション体験を提供し、ユーザーが必要な機能に迅速にアクセスできるようにする。

### 背景

- 9つのロール（system_admin, tenant_admin, organizer, venue_staff, streaming_provider, event_planner, speaker, sales_marketing, participant）が存在
- ロールごとに必要な機能が異なる
- デスクトップとモバイルで最適なナビゲーション体験を提供する必要がある
- AIアシスタント（EVT-050）への入口をヘッダーに常設する

### ゴール

- [CORE] ロール別の権限に基づいたメニュー項目の表示
- [CORE] デスクトップ：サイドバー、モバイル：ハンバーガーメニュー＋ボトムタブ
- [CORE] 現在位置の視覚的なハイライト
- [CORE] AIアシスタント入力エリアのグローバル配置

---

## §3 機能要件

### [CORE] 必須要件（MUST）

#### FR-001: ヘッダー
- **[CORE]** ロゴ、テナント名、AIアシスタント入力、ユーザーメニュー、通知アイコンを含む
- **[CORE]** 全ページ（認証済み）で固定表示
- **[CORE]** レスポンシブ対応（モバイルではハンバーガーメニューボタン表示）

#### FR-002: サイドバー（デスクトップ）
- **[CORE]** ロールベースのメニュー項目表示
- **[CORE]** 現在のページに対応するメニュー項目をハイライト
- **[CORE]** アイコン＋テキストのメニュー構成

#### FR-003: アクティブメニューのハイライト
- **[CORE]** 現在のページに対応するメニュー項目を視覚的に強調
- **[CORE]** サブメニューがある場合、親メニューもハイライト

#### FR-005: モバイルハンバーガーメニュー
- **[CORE]** ヘッダーのハンバーガーアイコンでサイドバーをオーバーレイ表示
- **[CORE]** 背景をタップで閉じる

#### FR-007: 通知バッジ
- **[CORE]** 未読通知がある場合、ベルアイコンにバッジ表示
- **[CORE]** 通知数を表示（99+で打ち止め）

#### FR-008: ユーザードロップダウン
- **[CORE]** プロフィール、設定、ログアウトのメニュー
- **[CORE]** ユーザー名とロール名を表示

### [CONTRACT] 推奨要件（SHOULD）

#### FR-004: サイドバーの折りたたみ
- **[CONTRACT]** アイコンのみ表示モードへの切り替え
- **[CONTRACT]** 折りたたみ状態をlocalStorageに保存

#### FR-006: モバイルボトムタブバー
- **[CONTRACT]** 主要機能への素早いアクセス（ダッシュボード、イベント、タスク、通知）
- **[CONTRACT]** アクティブタブをハイライト

#### FR-009: テナント切り替え
- **[CONTRACT]** 複数テナントに所属するユーザー向け
- **[CONTRACT]** ドロップダウンでテナント選択

### [DETAIL] オプション要件（MAY）

- 検索機能（メニュー項目のフィルタリング）
- お気に入りメニュー（ピン留め機能）
- キーボードショートカット

### §3-E: 入出力例 [CONTRACT]

| # | 操作 | 入力・条件 | 期待する出力 |
|---|------|-----------|-------------|
| 1 | ロール別メニュー表示（organizer） | organizer でログイン | ダッシュボード / イベント管理 / タスク / 通知 メニューが表示される |
| 2 | ロール別メニュー表示（participant） | participant でログイン | ポータルレイアウト（サイドバーなし）。マイイベント / マイタスクのみ |
| 3 | アクティブメニューハイライト | `/app/events` ページを表示中 | 「イベント管理」メニュー項目が `bg-primary-100 text-primary-700` でハイライト |
| 4 | テナント切り替え | テナントA → テナントBに切替 | ヘッダーのテナント名がテナントBに変更され、メニュー項目がテナントBのロールに基づいて再取得される |
| 5 | モバイルハンバーガー | ビューポート幅 768px 以下 | ヘッダーにハンバーガーメニューボタン（`i-heroicons-bars-3`）が表示される |
| 6 | 通知バッジ表示 | 未読通知 5 件 | ベルアイコン（`i-heroicons-bell`）上に赤色バッジ「5」が表示される |
| 7 | 通知バッジ上限 | 未読通知 150 件 | バッジ表示は「99+」 |
| 8 | サイドバー折りたたみ | 展開状態でトグルボタンクリック | サイドバー幅が 256px → 64px に遷移。アイコンのみ表示。`localStorage.sidebar_collapsed = "true"` |

### §3-F: 境界値 [CONTRACT]

| 項目 | 最小値 | 最大値 | 備考 |
|------|--------|--------|------|
| メニュー項目数 | 2（participant: ポータル） | 8+（system_admin: 管理画面全項目） | ロール定義に準拠 |
| テナント名表示 | 1文字 | 100文字（DB上限） | ヘッダー表示は 30 文字で truncate（`...`付与） |
| 通知バッジ | 0 → バッジ非表示 | 99 → 数値表示 / 100以上 → "99+" | `notificationCount > 99 ? '99+' : notificationCount` |
| サイドバー幅 | 64px（折りたたみ時） | 256px（展開時） | CSS transition: `transition-all` |
| ブレークポイント | < 768px → モバイル（ハンバーガー + ボトムタブ） | ≥ 1024px → デスクトップ（サイドバー常時表示） | 768px〜1023px はタブレット（サイドバー折りたたみ推奨） |
| ボトムタブ項目数 | 3（speaker） | 4（baseMenu.slice(0, 4)） | ロール別メニューの先頭4項目を表示 |

### §3-G: 例外レスポンス [CONTRACT]

| エラーコード | HTTP | メッセージ | 発生条件 | 挙動 |
|-------------|------|-----------|---------|------|
| UNAUTHORIZED | 401 | 認証が必要です | セッション Cookie なし / 無効 | `/login` にリダイレクト |
| FORBIDDEN | 403 | アクセス権限がありません | ロール不一致のメニュー項目に直接 URL アクセス | 403 エラーページ表示 |
| TENANT_NOT_FOUND | 404 | テナントが見つかりません | テナント切り替え時に無効な tenantId を指定 | エラートースト表示 + 現在のテナントを維持 |
| SESSION_EXPIRED | 401 | セッションが期限切れです | セッション有効期限切れ（API 呼び出し時に検知） | `/login` にリダイレクト + 「再ログインしてください」トースト |
| MENU_FETCH_FAILED | 500 | メニュー情報の取得に失敗しました | `/api/navigation/menu` サーバーエラー | フォールバック: ハードコードされたロール別メニューを使用 |

### §3-H: 受け入れテスト（Gherkin） [CONTRACT]

```gherkin
Feature: ナビゲーション（ヘッダー・サイドバー・モバイル）

  # --- ロール別メニュー表示 ---

  Scenario: organizer ログイン時に正しいメニュー項目が表示される
    Given organizer ロールのユーザーがログイン済み
    When ダッシュボードページを表示する
    Then サイドバーに以下のメニュー項目が表示される:
      | ダッシュボード | イベント管理 | タスク | 通知 |
    And 他のロール専用メニュー（テナント管理、メンバー管理等）は表示されない

  Scenario: participant ログイン時に制限メニューが表示される
    Given participant ロールのユーザーがログイン済み
    When ポータルページを表示する
    Then サイドバーは表示されない
    And ポータル専用レイアウトが適用される

  Scenario: system_admin ログイン時に全管理メニューが表示される
    Given system_admin ロールのユーザーがログイン済み
    When 管理ダッシュボードページを表示する
    Then サイドバーに以下のメニュー項目が表示される:
      | ダッシュボード | テナント管理 | ユーザー管理 | システム設定 |

  # --- アクティブメニューハイライト ---

  Scenario: 現在のページに対応するメニュー項目がハイライトされる
    Given organizer ロールのユーザーがログイン済み
    When "/events" ページに遷移する
    Then 「イベント管理」メニュー項目が aria-current="page" でハイライトされる
    And 他のメニュー項目はハイライトされない

  # --- サイドバー折りたたみ ---

  Scenario: サイドバー折りたたみと状態の永続化
    Given デスクトップ表示でサイドバーが展開状態（256px）
    When サイドバー折りたたみトグルボタンをクリックする
    Then サイドバー幅が 64px に変更される
    And アイコンのみ表示になる
    And localStorage に "sidebar_collapsed" = "true" が保存される
    When ページをリロードする
    Then サイドバーは折りたたみ状態（64px）で表示される

  # --- モバイルハンバーガーメニュー ---

  Scenario: モバイルでハンバーガーメニューが開閉する
    Given ビューポート幅が 375px のモバイル表示
    And サイドバーは非表示
    When ハンバーガーアイコンをタップする
    Then サイドバーがオーバーレイで表示される
    And 背景が暗転する
    When メニュー項目「イベント管理」をタップする
    Then "/events" ページに遷移する
    And サイドバーが自動的に閉じる

  # --- 通知バッジ ---

  Scenario: 未読通知がある場合にバッジが表示される
    Given 未読通知が 5 件ある
    When ヘッダーが表示される
    Then ベルアイコンに赤色バッジ「5」が表示される

  Scenario: 未読通知がない場合にバッジが非表示になる
    Given 未読通知が 0 件
    When ヘッダーが表示される
    Then ベルアイコンにバッジは表示されない

  # --- ユーザードロップダウン ---

  Scenario: ユーザードロップダウンメニューが表示される
    Given ログイン済みのユーザー
    When ヘッダーのユーザーアバターをクリックする
    Then ドロップダウンメニューが表示される
    And 以下の項目が含まれる:
      | プロフィール | 設定 | ログアウト |
    When 「ログアウト」をクリックする
    Then ログアウト処理が実行される
    And "/login" にリダイレクトされる

  # --- テナント切り替え ---

  Scenario: テナントを切り替えるとメニューが再取得される
    Given 複数テナントに所属するユーザーがログイン済み
    And 現在テナントAが選択されている
    When テナント切り替えドロップダウンでテナントBを選択する
    Then ヘッダーのテナント名がテナントBに変更される
    And メニュー項目がテナントBのロールに基づいて再取得される

  # --- キーボードショートカット ---

  Scenario: Ctrl+K で AI アシスタントが起動する
    Given ログイン済みのユーザーがダッシュボードを表示中
    When Ctrl+K（Mac: Cmd+K）を押下する
    Then AI アシスタント画面に遷移する
```

---

## §4 非機能要件

### パフォーマンス
- **[CORE]** メニュー展開・折りたたみのアニメーション：< 300ms
- **[CORE]** 通知カウントの取得：< 500ms

### ユーザビリティ
- **[CORE]** タッチターゲットサイズ：最小44x44px（モバイル）
- **[CORE]** サイドバー幅：デスクトップ 256px（展開時）、64px（折りたたみ時）

### アクセシビリティ
- **[CORE]** ARIA属性の適切な設定（role, aria-label, aria-current）
- **[CORE]** キーボードナビゲーション対応（Tab, Enter, Escape）

---

## §5 画面フロー

### [CORE] 基本フロー

```
[ログイン成功]
    ↓
[ダッシュボードレイアウト表示]
    ├─ ヘッダー（ロゴ、AI入力、通知、ユーザーメニュー）
    ├─ サイドバー（ロール別メニュー）※デスクトップ
    └─ メインコンテンツエリア
    └─ ボトムタブバー ※モバイル

[メニュー項目クリック]
    ↓
[該当ページへ遷移]
    ↓
[アクティブメニューをハイライト]

[通知アイコンクリック]
    ↓
[通知ドロップダウン表示]

[ユーザーアバタークリック]
    ↓
[ユーザードロップダウン表示]
    ├─ プロフィール
    ├─ 設定
    └─ ログアウト
```

### [CONTRACT] モバイルフロー

```
[モバイル：ハンバーガーアイコンタップ]
    ↓
[サイドバーオーバーレイ表示]
    ↓
[メニュー項目タップ]
    ↓
[ページ遷移 + サイドバー自動クローズ]

[モバイル：ボトムタブタップ]
    ↓
[該当ページへ遷移]
    ↓
[アクティブタブをハイライト]
```

---

## §6 UI仕様

### [CORE] デスクトップレイアウト

```
┌─────────────────────────────────────────────────────────────────┐
│ [Logo] 配信プラス HUB  │ [AI入力]  [🔔3] [User▼]                │ ← Header (64px)
├──────────┬──────────────────────────────────────────────────────┤
│          │                                                      │
│ [icon]   │                                                      │
│ Dashboard│                                                      │
│ =========│                                                      │
│          │                                                      │
│ [icon]   │                                                      │
│ イベント  │          Main Content Area                          │
│          │                                                      │
│ [icon]   │                                                      │
│ タスク    │                                                      │
│          │                                                      │
│ [icon]   │                                                      │
│ 設定      │                                                      │
│          │                                                      │
│          │                                                      │
└──────────┴──────────────────────────────────────────────────────┘
  Sidebar
  (256px)
```

### [CORE] モバイルレイアウト

```
┌─────────────────────────────────────┐
│ [☰] 配信プラス HUB  [🔔3] [User▼]  │ ← Header (56px)
├─────────────────────────────────────┤
│                                     │
│                                     │
│                                     │
│       Main Content Area             │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ [🏠] [📅] [✓] [🔔]                  │ ← Bottom Tabs (64px)
│  Home Events Tasks Notify           │
└─────────────────────────────────────┘
```

### [CORE] ヘッダーコンポーネント仕様

```vue
<!-- AppHeader.vue -->
<template>
  <header class="h-16 bg-white border-b border-gray-200 flex items-center px-4">
    <!-- Mobile: Hamburger -->
    <button @click="toggleSidebar" class="lg:hidden mr-3">
      <UIcon name="i-heroicons-bars-3" class="w-6 h-6" />
    </button>

    <!-- Logo & Tenant Name -->
    <div class="flex items-center gap-3">
      <img src="/logo.svg" alt="Logo" class="w-8 h-8" />
      <span class="font-bold text-lg hidden sm:block">配信プラス HUB</span>
      <span class="text-sm text-gray-500 hidden md:block">{{ tenantName }}</span>
    </div>

    <!-- AI Input (EVT-050 entry point) -->
    <div class="flex-1 max-w-xl mx-4 hidden md:block">
      <UInput
        v-model="aiQuery"
        placeholder="AIに聞く・頼む（Ctrl+K）"
        icon="i-heroicons-sparkles"
        @focus="openAIAssistant"
      />
    </div>

    <!-- Right: Notifications & User Menu -->
    <div class="ml-auto flex items-center gap-4">
      <!-- Notifications -->
      <UButton variant="ghost" icon="i-heroicons-bell" @click="toggleNotifications">
        <UBadge v-if="notificationCount > 0" color="red" size="xs">
          {{ notificationCount > 99 ? '99+' : notificationCount }}
        </UBadge>
      </UButton>

      <!-- User Dropdown -->
      <UDropdown :items="userMenuItems">
        <UButton variant="ghost" class="flex items-center gap-2">
          <UAvatar :src="user.avatar" :alt="user.name" size="sm" />
          <span class="hidden sm:block">{{ user.name }}</span>
          <UIcon name="i-heroicons-chevron-down" class="w-4 h-4" />
        </UButton>
      </UDropdown>
    </div>
  </header>
</template>
```

### [CORE] サイドバーコンポーネント仕様

```vue
<!-- AppSidebar.vue -->
<template>
  <aside
    :class="[
      'h-full bg-gray-50 border-r border-gray-200 transition-all',
      isCollapsed ? 'w-16' : 'w-64',
      isMobileOpen ? 'fixed inset-y-0 left-0 z-40' : 'hidden lg:block'
    ]"
  >
    <!-- Sidebar Header -->
    <div class="h-16 flex items-center justify-between px-4 border-b">
      <span v-if="!isCollapsed" class="font-semibold">メニュー</span>
      <button @click="toggleCollapse" class="hidden lg:block">
        <UIcon :name="isCollapsed ? 'i-heroicons-chevron-right' : 'i-heroicons-chevron-left'" />
      </button>
    </div>

    <!-- Menu Items -->
    <nav class="p-2">
      <ul class="space-y-1">
        <li v-for="item in menuItems" :key="item.path">
          <NuxtLink
            :to="item.path"
            :class="[
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
              isActive(item.path)
                ? 'bg-primary-100 text-primary-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            ]"
            @click="closeMobileMenu"
          >
            <UIcon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
            <span v-if="!isCollapsed">{{ item.label }}</span>
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </aside>

  <!-- Mobile Overlay -->
  <div
    v-if="isMobileOpen"
    class="fixed inset-0 bg-black/50 z-30 lg:hidden"
    @click="closeMobileMenu"
  />
</template>
```

### [CORE] ロール別メニュー定義

```typescript
// constants/navigation.ts

export const NAVIGATION_MENUS: Record<UserRole, MenuItem[]> = {
  system_admin: [
    { path: '/admin/dashboard', label: 'ダッシュボード', icon: 'i-heroicons-home' },
    { path: '/admin/tenants', label: 'テナント管理', icon: 'i-heroicons-building-office' },
    { path: '/admin/users', label: 'ユーザー管理', icon: 'i-heroicons-users' },
    { path: '/admin/settings', label: 'システム設定', icon: 'i-heroicons-cog-6-tooth' },
  ],

  tenant_admin: [
    { path: '/dashboard', label: 'ダッシュボード', icon: 'i-heroicons-home' },
    { path: '/events', label: 'イベント管理', icon: 'i-heroicons-calendar-days' },
    { path: '/members', label: 'メンバー管理', icon: 'i-heroicons-users' },
    { path: '/venues', label: '会場管理', icon: 'i-heroicons-building-office-2' },
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

  participant: [], // ポータルレイアウト使用（サイドバーなし）
}

export interface MenuItem {
  path: string
  label: string
  icon: string
  children?: MenuItem[]
}
```

### [CONTRACT] ボトムタブバー仕様

```vue
<!-- MobileBottomTabs.vue -->
<template>
  <nav class="h-16 bg-white border-t border-gray-200 flex items-center justify-around lg:hidden">
    <button
      v-for="tab in bottomTabs"
      :key="tab.path"
      @click="navigateTo(tab.path)"
      :class="[
        'flex flex-col items-center gap-1 px-3 py-2',
        isActive(tab.path) ? 'text-primary-600' : 'text-gray-600'
      ]"
    >
      <UIcon :name="tab.icon" class="w-6 h-6" />
      <span class="text-xs">{{ tab.label }}</span>
      <UBadge v-if="tab.badge" color="red" size="xs">{{ tab.badge }}</UBadge>
    </button>
  </nav>
</template>

<script setup lang="ts">
const bottomTabs = computed(() => {
  const role = useAuthStore().user?.role
  const baseMenu = NAVIGATION_MENUS[role] || []

  // 主要4項目をボトムタブに表示
  return baseMenu.slice(0, 4)
})
</script>
```

### [CORE] ユーザードロップダウン仕様

```typescript
// composables/useUserMenu.ts

export const useUserMenu = () => {
  const authStore = useAuthStore()
  const router = useRouter()

  const userMenuItems = computed(() => [
    [{
      label: authStore.user?.name || '',
      slot: 'account',
      disabled: true,
    }],
    [{
      label: 'プロフィール',
      icon: 'i-heroicons-user-circle',
      click: () => router.push('/profile'),
    }],
    [{
      label: '設定',
      icon: 'i-heroicons-cog-6-tooth',
      click: () => router.push('/settings'),
    }],
    [{
      label: 'ログアウト',
      icon: 'i-heroicons-arrow-right-on-rectangle',
      click: () => authStore.logout(),
    }],
  ])

  return { userMenuItems }
}
```

### [CORE] レスポンシブブレークポイント

```typescript
// tailwind.config.ts breakpoints (Tailwind CSS v4)

export default {
  theme: {
    screens: {
      sm: '640px',  // モバイル横向き
      md: '768px',  // タブレット
      lg: '1024px', // デスクトップ（サイドバー表示開始）
      xl: '1280px', // 大型デスクトップ
    }
  }
}
```

---

## §7 ビジネスルール

### [CORE] メニュー表示ルール

#### BR-001: ロール別メニューフィルタリング
- メニュー項目はユーザーのロールに基づいて動的にフィルタリングされる
- 権限のないメニュー項目は表示されない（非表示、グレーアウトではない）

#### BR-002: participantロールのレイアウト
- participantロールはポータルレイアウト（サイドバーなし）を使用
- ヘッダーのみ表示し、イベント参加用の専用UIを提供

#### BR-003: AIアシスタント入力の配置
- ヘッダーに常時表示（participantを除く全ロール）
- モバイルでは検索アイコンからモーダル起動
- ショートカット：Ctrl+K（Windows）、Cmd+K（Mac）

### [CONTRACT] 通知ルール

#### BR-004: 通知カウント更新
- ポーリング間隔：30秒
- WebSocket接続時はリアルタイム更新
- 99+で表示を打ち止め

#### BR-005: アクティブメニューハイライト
- 現在のルートパスと完全一致するメニュー項目をハイライト
- サブメニューがある場合、親メニューもハイライト

### [DETAIL] サイドバー折りたたみルール

#### BR-006: 折りたたみ状態の永続化
- localStorageに`sidebar_collapsed`として保存
- デフォルト：展開状態（`false`）
- 画面幅が1024px未満では自動的に折りたたみ（モバイル）

---

## §8 API仕様

### [CORE] 通知カウント取得

```typescript
GET /api/notifications/count

Response 200:
{
  "count": 3,
  "hasUnread": true
}

Error 401:
{
  "error": "UNAUTHORIZED",
  "message": "認証が必要です"
}
```

### [CONTRACT] メニュー取得（動的メニュー対応）

```typescript
GET /api/navigation/menu

Response 200:
{
  "menuItems": [
    {
      "path": "/dashboard",
      "label": "ダッシュボード",
      "icon": "i-heroicons-home",
      "children": []
    },
    {
      "path": "/events",
      "label": "イベント管理",
      "icon": "i-heroicons-calendar-days",
      "children": [
        {
          "path": "/events/upcoming",
          "label": "開催予定",
          "icon": "i-heroicons-calendar"
        }
      ]
    }
  ]
}
```

---

## §9 データモデル

### [CORE] 関連エンティティ

```typescript
// 既存モデルを参照（SSOT-4_DATA_MODEL.md）

interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: UserRole // navigation menu source
  tenantId: string
}

interface Tenant {
  id: string
  name: string // ヘッダーに表示
  logo?: string
}

interface Notification {
  id: string
  userId: string
  title: string
  message: string
  isRead: boolean
  createdAt: Date
}
```

### [CONTRACT] UIステート

```typescript
// stores/navigation.ts

export const useNavigationStore = defineStore('navigation', {
  state: () => ({
    isSidebarCollapsed: false,
    isMobileSidebarOpen: false,
    notificationCount: 0,
  }),

  actions: {
    toggleSidebar() {
      this.isSidebarCollapsed = !this.isSidebarCollapsed
      localStorage.setItem('sidebar_collapsed', String(this.isSidebarCollapsed))
    },

    toggleMobileSidebar() {
      this.isMobileSidebarOpen = !this.isMobileSidebarOpen
    },

    async fetchNotificationCount() {
      const { data } = await $fetch('/api/notifications/count')
      this.notificationCount = data.count
    },
  },
})
```

---

## §10 状態遷移

### [CORE] サイドバー状態

```
[デスクトップ]
  展開状態 ←→ 折りたたみ状態
  (256px)     (64px)

  トグルボタンクリック → 状態切り替え + localStorage保存

[モバイル]
  非表示 → ハンバーガークリック → オーバーレイ表示
         ← メニュー項目クリック ←
         ← 背景タップ ←
         ← Escapeキー ←
```

### [CONTRACT] 通知状態

```
[初期状態]
  notificationCount: 0

[ポーリング開始（30秒間隔）]
  → API呼び出し → count更新

[通知アイコンクリック]
  → 通知ドロップダウン表示
  → 既読処理
  → count減少
```

---

## §11 実装ガイド

### [CORE] ファイル構成

```
layouts/
  dashboard.vue           ← メインレイアウト（ヘッダー + サイドバー + コンテンツ）

components/
  AppHeader.vue           ← ヘッダーコンポーネント
  AppSidebar.vue          ← サイドバーコンポーネント
  MobileBottomTabs.vue    ← モバイルボトムタブ
  UserMenu.vue            ← ユーザードロップダウン
  NotificationDropdown.vue ← 通知ドロップダウン

constants/
  navigation.ts           ← ロール別メニュー定義

stores/
  navigation.ts           ← ナビゲーション状態管理

composables/
  useNavigation.ts        ← ナビゲーションロジック
  useUserMenu.ts          ← ユーザーメニューロジック
```

### [CORE] layouts/dashboard.vue

```vue
<template>
  <div class="h-screen flex flex-col">
    <!-- Header -->
    <AppHeader />

    <div class="flex-1 flex overflow-hidden">
      <!-- Sidebar (Desktop + Mobile Overlay) -->
      <AppSidebar />

      <!-- Main Content -->
      <main class="flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-6">
        <slot />
      </main>
    </div>

    <!-- Mobile Bottom Tabs -->
    <MobileBottomTabs class="lg:hidden" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth'], // 認証必須
})
</script>
```

### [CORE] components/AppHeader.vue 実装

```vue
<script setup lang="ts">
const navigationStore = useNavigationStore()
const authStore = useAuthStore()
const { userMenuItems } = useUserMenu()

const aiQuery = ref('')
const notificationCount = computed(() => navigationStore.notificationCount)
const tenantName = computed(() => authStore.user?.tenant?.name || '')

const toggleSidebar = () => navigationStore.toggleMobileSidebar()
const openAIAssistant = () => {
  // EVT-050 AIアシスタントモーダルを開く
  navigateTo('/ai-assistant')
}

// 通知カウントのポーリング
onMounted(() => {
  navigationStore.fetchNotificationCount()
  const interval = setInterval(() => {
    navigationStore.fetchNotificationCount()
  }, 30000) // 30秒ごと

  onUnmounted(() => clearInterval(interval))
})
</script>
```

### [CORE] components/AppSidebar.vue 実装

```vue
<script setup lang="ts">
const navigationStore = useNavigationStore()
const authStore = useAuthStore()
const route = useRoute()

const isCollapsed = computed(() => navigationStore.isSidebarCollapsed)
const isMobileOpen = computed(() => navigationStore.isMobileSidebarOpen)

const menuItems = computed(() => {
  const role = authStore.user?.role
  return role ? NAVIGATION_MENUS[role] : []
})

const isActive = (path: string) => {
  return route.path === path || route.path.startsWith(path + '/')
}

const toggleCollapse = () => navigationStore.toggleSidebar()
const closeMobileMenu = () => navigationStore.toggleMobileSidebar()

// localStorageから折りたたみ状態を復元
onMounted(() => {
  const collapsed = localStorage.getItem('sidebar_collapsed')
  if (collapsed !== null) {
    navigationStore.isSidebarCollapsed = collapsed === 'true'
  }
})
</script>
```

### [CONTRACT] キーボードショートカット実装

```vue
<!-- layouts/dashboard.vue -->
<script setup lang="ts">
// Ctrl+K / Cmd+K でAIアシスタント起動
const handleKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    navigateTo('/ai-assistant')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>
```

### [CORE] アクセシビリティ実装

```vue
<!-- AppSidebar.vue -->
<aside
  role="navigation"
  aria-label="メインナビゲーション"
  :aria-hidden="!isMobileOpen && $isMobile"
>
  <nav>
    <ul role="list">
      <li v-for="item in menuItems" :key="item.path">
        <NuxtLink
          :to="item.path"
          :aria-current="isActive(item.path) ? 'page' : undefined"
          :aria-label="item.label"
        >
          <UIcon :name="item.icon" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</aside>
```

---

## §12 テスト仕様

### [CORE] ユニットテスト

```typescript
// tests/unit/stores/navigation.test.ts

describe('NavigationStore', () => {
  it('サイドバーのトグルが正しく動作する', () => {
    const store = useNavigationStore()
    expect(store.isSidebarCollapsed).toBe(false)

    store.toggleSidebar()
    expect(store.isSidebarCollapsed).toBe(true)
    expect(localStorage.getItem('sidebar_collapsed')).toBe('true')
  })

  it('通知カウントが正しく取得される', async () => {
    const store = useNavigationStore()
    await store.fetchNotificationCount()
    expect(store.notificationCount).toBeGreaterThanOrEqual(0)
  })
})

// tests/unit/components/AppSidebar.test.ts

describe('AppSidebar', () => {
  it('ロールに応じたメニュー項目が表示される', async () => {
    const authStore = useAuthStore()
    authStore.user = { role: 'tenant_admin', ...mockUser }

    const wrapper = mount(AppSidebar)

    expect(wrapper.text()).toContain('ダッシュボード')
    expect(wrapper.text()).toContain('イベント管理')
    expect(wrapper.text()).toContain('メンバー管理')
  })

  it('アクティブメニューがハイライトされる', async () => {
    const wrapper = mount(AppSidebar, {
      global: {
        mocks: {
          $route: { path: '/events' }
        }
      }
    })

    const activeLink = wrapper.find('[aria-current="page"]')
    expect(activeLink.exists()).toBe(true)
    expect(activeLink.text()).toContain('イベント管理')
  })
})
```

### [CONTRACT] E2Eテスト

```typescript
// tests/e2e/navigation.spec.ts

import { test, expect } from '@playwright/test'

test.describe('ナビゲーション', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'admin@example.com')
    await page.fill('[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('サイドバーメニューから各ページに遷移できる', async ({ page }) => {
    await page.click('text=イベント管理')
    await expect(page).toHaveURL('/events')

    await page.click('text=ダッシュボード')
    await expect(page).toHaveURL('/dashboard')
  })

  test('モバイル：ハンバーガーメニューが動作する', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    // サイドバーは非表示
    const sidebar = page.locator('aside')
    await expect(sidebar).not.toBeVisible()

    // ハンバーガーをクリック
    await page.click('button[aria-label="メニューを開く"]')
    await expect(sidebar).toBeVisible()

    // メニュー項目をクリック
    await page.click('text=イベント管理')
    await expect(page).toHaveURL('/events')

    // サイドバーが自動で閉じる
    await expect(sidebar).not.toBeVisible()
  })

  test('通知アイコンにバッジが表示される', async ({ page }) => {
    const badge = page.locator('[aria-label="通知"] >> .badge')
    await expect(badge).toBeVisible()
    await expect(badge).toHaveText(/\d+/)
  })

  test('ユーザーメニューからログアウトできる', async ({ page }) => {
    await page.click('[aria-label="ユーザーメニュー"]')
    await page.click('text=ログアウト')
    await expect(page).toHaveURL('/login')
  })

  test('Ctrl+KでAIアシスタントが起動する', async ({ page }) => {
    await page.keyboard.press('Control+K')
    await expect(page).toHaveURL('/ai-assistant')
  })
})
```

### [CORE] ビジュアルリグレッションテスト

```typescript
// tests/visual/navigation.spec.ts

test('デスクトップサイドバーのスナップショット', async ({ page }) => {
  await page.goto('/dashboard')
  const sidebar = page.locator('aside')
  await expect(sidebar).toHaveScreenshot('sidebar-desktop.png')
})

test('モバイルボトムタブのスナップショット', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/dashboard')
  const bottomTabs = page.locator('nav.mobile-bottom-tabs')
  await expect(bottomTabs).toHaveScreenshot('bottom-tabs-mobile.png')
})

test('折りたたみサイドバーのスナップショット', async ({ page }) => {
  await page.goto('/dashboard')
  await page.click('[aria-label="サイドバーを折りたたむ"]')
  const sidebar = page.locator('aside')
  await expect(sidebar).toHaveScreenshot('sidebar-collapsed.png')
})
```

---

## §13 未決定事項・制約 [CONTRACT]

### 前提条件

- Better Auth セッション認証済み（AUTH-001 / AUTH-002 準拠）
- ROLE-001 ロール定義に準拠（9ロール: system_admin, tenant_admin, organizer, venue_staff, streaming_provider, event_planner, speaker, sales_marketing, participant）
- Nuxt UI v3 コンポーネント利用（Tailwind CSS v4）
- EVT-050 AIアシスタントとの連携（ヘッダー入力エリア）

### 制約

- メニュー構成はサーバー側で決定（クライアントキャッシュ可、ポーリング不要）
- 9ロールのメニュー定義はハードコード（`constants/navigation.ts`）。DB管理はPost-MVP
- participant ロールはポータルレイアウト使用（サイドバーなし）
- 通知カウントのポーリング間隔は 30 秒固定（WebSocket 対応は Post-MVP）
- サイドバー折りたたみ状態の永続化は localStorage のみ（サーバー同期なし）
- ボトムタブバーの表示項目はロール別メニューの先頭 4 項目固定

### 未決定事項

| 項目ID | 項目 | 選択肢 | 期限 | 決定者 |
|--------|------|--------|------|--------|
| NAV-TBD-01 | メニュー定義方式 | (1) ハードコード（`constants/navigation.ts`） (2) DB管理（テナント別カスタム可） | MVP前 | Tech Lead |
| NAV-TBD-02 | ボトムタブバー対象項目 | (1) ダッシュボード/イベント/タスク/通知 (2) ロール別カスタム | Sprint 2 | UXデザイナー |
| NAV-TBD-03 | キーボードショートカット | (1) MVP実装（Ctrl+K のみ） (2) Post-MVP（フルショートカット対応） | Sprint 3 | PO |

---

## 付録

### A. 用語集

| 用語 | 説明 |
|------|------|
| サイドバー | デスクトップレイアウトで左側に固定表示されるナビゲーションメニュー |
| ボトムタブ | モバイルレイアウトで画面下部に表示されるタブバー |
| ハンバーガーメニュー | モバイルでサイドバーを呼び出すための3本線アイコン |
| アクティブメニュー | 現在表示中のページに対応するメニュー項目 |
| オーバーレイ | モバイルでサイドバーを表示する際の背景暗転レイヤー |

### B. 参考資料

- [Nuxt UI Navigation Documentation](https://ui.nuxt.com/components/navigation)
- [Tailwind CSS Layout](https://tailwindcss.com/docs/container)
- [ARIA Authoring Practices: Navigation](https://www.w3.org/WAI/ARIA/apg/patterns/navigation/)
- [Material Design: Navigation Drawer](https://m3.material.io/components/navigation-drawer/overview)

### C. 変更履歴

| 日付 | バージョン | 変更内容 | 変更者 |
|------|-----------|---------|--------|
| 2026-02-09 | 1.0 | 初版作成 | Claude |
| 2026-02-09 | 1.1 | §3-E/F/G/H（入出力例・境界値・例外レスポンス・受け入れテスト）追加、§13 未決定事項・制約 追加 | Claude |

---

## レビュー

- [ ] プロダクトオーナー承認
- [ ] 技術リード承認
- [ ] UI/UXデザイナー承認
- [ ] セキュリティレビュー完了
- [ ] アクセシビリティレビュー完了
