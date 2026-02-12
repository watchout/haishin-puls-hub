<!-- layouts/dashboard.vue -->
<!-- NAV-001-002-006: メインダッシュボードレイアウト -->
<!-- 仕様書: docs/design/features/common/NAV-001-002-006_navigation.md §11 -->

<script setup lang="ts">
const { isPortalLayout } = useNavigation()
const tenantStore = useTenantStore()

/** participant ロールはポータルレイアウト (BR-002) */
const showSidebar = computed(() => !isPortalLayout(tenantStore.currentRole))

/** Ctrl+K / Cmd+K でAIアシスタント起動 (BR-003) */
function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    navigateTo('/ai-assistant')
  }
}

onMounted(() => {
  if (import.meta.client) {
    window.addEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('keydown', handleKeydown)
  }
})
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
        <slot />
      </main>
    </div>

    <!-- Mobile Bottom Tabs (FR-006) -->
    <MobileBottomTabs v-if="showSidebar" />
  </div>
</template>
