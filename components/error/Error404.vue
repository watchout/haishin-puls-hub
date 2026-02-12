<!-- components/error/Error404.vue -->
<!-- ERR-001: 404 Not Found ページ -->
<!-- 仕様書: docs/design/features/common/ERR-001-003_error-pages.md §6.1 -->

<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{
  error: NuxtError
}>()

const searchQuery = ref('')

const popularLinks = [
  { label: 'ダッシュボード', to: '/dashboard', icon: 'i-heroicons-home' },
  { label: 'イベント一覧', to: '/events', icon: 'i-heroicons-calendar' },
  { label: 'マイタスク', to: '/tasks', icon: 'i-heroicons-check-circle' },
  { label: 'ヘルプセンター', to: '/help', icon: 'i-heroicons-question-mark-circle' },
]

const handleSearch = () => {
  const query = searchQuery.value.trim()
  if (query) {
    clearError({ redirect: `/search?q=${encodeURIComponent(query)}` })
  }
}

const goBack = () => {
  if (import.meta.client && window.history.length > 1) {
    window.history.back()
  } else {
    clearError({ redirect: '/' })
  }
}

const goHome = () => {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50 dark:bg-gray-900">
    <div class="max-w-2xl w-full">
      <div class="text-center">
        <!-- Icon -->
        <div class="mb-6">
          <UIcon
            name="i-heroicons-question-mark-circle"
            class="w-24 h-24 mx-auto text-gray-400 dark:text-gray-600"
          />
        </div>

        <!-- Title -->
        <h1
          class="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100"
          role="alert"
          aria-live="assertive"
        >
          ページが見つかりません
        </h1>

        <!-- Description -->
        <p class="text-base mb-8 text-gray-600 dark:text-gray-400">
          お探しのページは削除されたか、URLが変更された可能性があります。
        </p>

        <!-- Search Bar -->
        <form class="mb-8 max-w-md mx-auto" @submit.prevent="handleSearch">
          <UInput
            v-model="searchQuery"
            placeholder="ページを検索..."
            size="lg"
            icon="i-heroicons-magnifying-glass"
            aria-label="ページ検索"
          />
        </form>

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <UButton
            variant="outline"
            size="lg"
            icon="i-heroicons-arrow-left"
            class="w-full sm:w-auto"
            @click="goBack"
          >
            前に戻る
          </UButton>
          <UButton
            color="primary"
            size="lg"
            icon="i-heroicons-home"
            class="w-full sm:w-auto"
            @click="goHome"
          >
            ホーム
          </UButton>
        </div>

        <!-- Popular Links -->
        <div class="text-left max-w-md mx-auto">
          <h2 class="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300">
            よく見られるページ
          </h2>
          <ul class="space-y-2">
            <li v-for="link in popularLinks" :key="link.to">
              <NuxtLink
                :to="link.to"
                class="flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:underline"
                @click.prevent="clearError({ redirect: link.to })"
              >
                <UIcon :name="link.icon" class="w-5 h-5" />
                {{ link.label }}
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
