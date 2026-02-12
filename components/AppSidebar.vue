<!-- components/AppSidebar.vue -->
<!-- NAV-002: サイドバーコンポーネント (FR-002, FR-003, FR-004, FR-005) -->
<!-- 仕様書: docs/design/features/common/NAV-001-002-006_navigation.md §6, §11 -->

<script setup lang="ts">
const navigationStore = useNavigationStore()
const tenantStore = useTenantStore()
const { getMenuItems, isActive } = useNavigation()

const isCollapsed = computed(() => navigationStore.isSidebarCollapsed)
const isMobileOpen = computed(() => navigationStore.isMobileSidebarOpen)

const menuItems = computed(() => getMenuItems(tenantStore.currentRole))

/** サイドバー折りたたみトグル (FR-004) */
const toggleCollapse = () => navigationStore.toggleSidebar()

/** モバイルメニューを閉じる (FR-005) */
const closeMobileMenu = () => navigationStore.closeMobileSidebar()

/** localStorage からサイドバー状態を復元 (BR-006) */
onMounted(() => {
  navigationStore.restoreSidebarState()
})
</script>

<template>
  <!-- Sidebar -->
  <aside
    role="navigation"
    aria-label="メインナビゲーション"
    :class="[
      'h-full bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 shrink-0',
      isCollapsed ? 'w-16' : 'w-64',
      isMobileOpen
        ? 'fixed inset-y-0 left-0 z-40'
        : 'hidden lg:block',
    ]"
  >
    <!-- Sidebar Header -->
    <div class="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
      <span v-if="!isCollapsed" class="font-semibold text-sm text-gray-700 dark:text-gray-300">
        メニュー
      </span>
      <UButton
        variant="ghost"
        color="neutral"
        size="xs"
        class="hidden lg:flex"
        aria-label="サイドバーを折りたたむ"
        @click="toggleCollapse"
      >
        <UIcon
          :name="isCollapsed ? 'i-heroicons-chevron-right' : 'i-heroicons-chevron-left'"
          class="w-4 h-4"
        />
      </UButton>
    </div>

    <!-- Menu Items (FR-002) -->
    <nav class="p-2">
      <ul role="list" class="space-y-1">
        <li v-for="item in menuItems" :key="item.path">
          <NuxtLink
            :to="item.path"
            :class="[
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
              isActive(item.path)
                ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
            ]"
            :aria-current="isActive(item.path) ? 'page' : undefined"
            :aria-label="item.label"
            :title="isCollapsed ? item.label : undefined"
            @click="closeMobileMenu"
          >
            <UIcon :name="item.icon" class="w-5 h-5 shrink-0" aria-hidden="true" />
            <span v-if="!isCollapsed" class="truncate">{{ item.label }}</span>
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </aside>

  <!-- Mobile Overlay (FR-005) -->
  <Transition name="fade">
    <div
      v-if="isMobileOpen"
      class="fixed inset-0 bg-black/50 z-30 lg:hidden"
      aria-hidden="true"
      @click="closeMobileMenu"
    />
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
