<!-- layouts/dashboard.vue -->
<!-- NAV-001-002-006: メインダッシュボードレイアウト -->
<!-- 仕様書: docs/design/features/common/NAV-001-002-006_navigation.md §11 -->

<script setup lang="ts">
const { isPortalLayout } = useNavigation()
const tenantStore = useTenantStore()

/** participant ロールはポータルレイアウト (BR-002) */
const showSidebar = computed(() => !isPortalLayout(tenantStore.currentRole))

// EVT-050-051: Cmd+K / Ctrl+K ショートカットは AppHeader に移動済み
</script>

<template>
  <div class="h-screen flex flex-col">
    <!-- Header (FR-001) -->
    <AppHeader />

    <div class="flex-1 flex overflow-hidden">
      <!-- Sidebar: Desktop + Mobile Overlay (FR-002, FR-005) -->
      <AppSidebar v-if="showSidebar" />

      <!-- Main Content -->
      <main class="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">
        <!-- AUTH-007 §7.3: メール未確認バナー（ダッシュボード上部に表示） -->
        <FeaturesAuthEmailVerificationBanner class="mb-4" />
        <slot />
      </main>
    </div>

    <!-- Mobile Bottom Tabs (FR-006) -->
    <MobileBottomTabs v-if="showSidebar" />

    <!-- EVT-050-051: AIチャットパネル（スライドオーバー） -->
    <FeaturesAIChatPanel />
  </div>
</template>
