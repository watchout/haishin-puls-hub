<!-- components/MobileBottomTabs.vue -->
<!-- NAV-006: モバイルボトムタブバー (FR-006) -->
<!-- 仕様書: docs/design/features/common/NAV-001-002-006_navigation.md §6 -->

<script setup lang="ts">
const tenantStore = useTenantStore()
const { getBottomTabItems, isActive } = useNavigation()

/** ボトムタブ項目（ロール別メニューの先頭4項目） (§3-F) */
const bottomTabs = computed(() => getBottomTabItems(tenantStore.currentRole))
</script>

<template>
  <nav
    class="h-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-around lg:hidden shrink-0"
    aria-label="モバイルナビゲーション"
  >
    <NuxtLink
      v-for="tab in bottomTabs"
      :key="tab.path"
      :to="tab.path"
      :class="[
        'flex flex-col items-center gap-1 px-3 py-2 min-w-[64px]',
        isActive(tab.path)
          ? 'text-primary-600 dark:text-primary-400'
          : 'text-gray-500 dark:text-gray-400',
      ]"
      :aria-current="isActive(tab.path) ? 'page' : undefined"
      :aria-label="tab.label"
    >
      <UIcon :name="tab.icon" class="w-6 h-6" aria-hidden="true" />
      <span class="text-xs truncate">{{ tab.label }}</span>
    </NuxtLink>
  </nav>
</template>
