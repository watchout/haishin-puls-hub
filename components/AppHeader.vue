<!-- components/AppHeader.vue -->
<!-- NAV-001: ヘッダーコンポーネント (FR-001) -->
<!-- 仕様書: docs/design/features/common/NAV-001-002-006_navigation.md §6 -->

<script setup lang="ts">
import { formatNotificationCount, truncateTenantName } from '~/constants/navigation'

const navigationStore = useNavigationStore()
const authStore = useAuthStore()
const tenantStore = useTenantStore()
const { userMenuItems } = useUserMenu()

const notificationCount = computed(() => navigationStore.notificationCount)
const notificationBadge = computed(() => formatNotificationCount(notificationCount.value))
const tenantName = computed(() => truncateTenantName(tenantStore.tenantName))
const userName = computed(() => authStore.user?.name ?? '')
const userAvatar = computed(() => authStore.user?.avatarUrl ?? undefined)

/** モバイルサイドバーをトグル (FR-005) */
const toggleSidebar = () => navigationStore.toggleMobileSidebar()
</script>

<template>
  <header class="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 shrink-0">
    <!-- Mobile: Hamburger (FR-005) -->
    <UButton
      variant="ghost"
      color="neutral"
      class="lg:hidden mr-3"
      aria-label="メニューを開く"
      @click="toggleSidebar"
    >
      <UIcon name="i-heroicons-bars-3" class="w-6 h-6" />
    </UButton>

    <!-- Logo & Tenant Name -->
    <div class="flex items-center gap-3">
      <span class="font-bold text-lg text-gray-900 dark:text-gray-100">配信プラス HUB</span>
      <span
        v-if="tenantName"
        class="text-sm text-gray-500 dark:text-gray-400 hidden md:block"
      >
        {{ tenantName }}
      </span>
    </div>

    <!-- AI Input placeholder (BR-003 / EVT-050 entry point) -->
    <div class="flex-1 max-w-xl mx-4 hidden md:block">
      <UInput
        placeholder="AIに聞く・頼む（Ctrl+K）"
        icon="i-heroicons-sparkles"
        readonly
        aria-label="AIアシスタント"
        @click="navigateTo('/ai-assistant')"
      />
    </div>

    <!-- Right: Notifications & User Menu -->
    <div class="ml-auto flex items-center gap-2">
      <!-- Notifications (FR-007) -->
      <UButton
        variant="ghost"
        color="neutral"
        aria-label="通知"
        @click="navigateTo('/notifications')"
      >
        <div class="relative">
          <UIcon name="i-heroicons-bell" class="w-5 h-5" />
          <UBadge
            v-if="notificationCount > 0"
            color="error"
            size="xs"
            class="absolute -top-2 -right-3 min-w-[18px] text-center"
          >
            {{ notificationBadge }}
          </UBadge>
        </div>
      </UButton>

      <!-- User Dropdown (FR-008) -->
      <UDropdownMenu :items="userMenuItems">
        <UButton variant="ghost" color="neutral" class="flex items-center gap-2">
          <UAvatar :src="userAvatar" :alt="userName" size="xs" />
          <span class="hidden sm:block text-sm">{{ userName }}</span>
          <UIcon name="i-heroicons-chevron-down" class="w-4 h-4" />
        </UButton>
      </UDropdownMenu>
    </div>
  </header>
</template>
