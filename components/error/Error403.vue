<!-- components/error/Error403.vue -->
<!-- ERR-002: 403 Forbidden ページ -->
<!-- 仕様書: docs/design/features/common/ERR-001-003_error-pages.md §6.2 -->

<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const config = useRuntimeConfig()
const supportEmail = computed(() => config.public.supportEmail || 'support@example.com')

const currentRole = computed(() => {
  return (props.error.data as Record<string, string> | undefined)?.currentRole || 'ゲスト'
})

const requiredRole = computed(() => {
  return (props.error.data as Record<string, string> | undefined)?.requiredRole || '不明'
})

const roleGuidance = computed(() => {
  const role = currentRole.value
  switch (role) {
    case 'participant':
    case 'viewer':
      return '閲覧のみ可能です。編集権限が必要です。'
    case 'speaker':
    case 'vendor':
      return '一部の機能にアクセスできません。管理者権限が必要です。'
    case 'organizer':
    case 'event_planner':
      return 'この機能にはより上位の権限が必要です。'
    default:
      return 'ログインしていないか、適切な権限がない可能性があります。'
  }
})

const handleRequestAccess = () => {
  clearError({ redirect: '/request-access' })
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
            name="i-heroicons-shield-exclamation"
            class="w-24 h-24 mx-auto text-orange-400 dark:text-orange-600"
          />
        </div>

        <!-- Title -->
        <h1
          class="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100"
          role="alert"
          aria-live="assertive"
        >
          アクセス権限がありません
        </h1>

        <!-- Description -->
        <p class="text-base mb-6 text-gray-600 dark:text-gray-400">
          このページにアクセスする権限がありません。
        </p>

        <!-- Role Info -->
        <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-8 text-left max-w-md mx-auto">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
              現在のロール:
            </span>
            <UBadge color="neutral" variant="subtle">
              {{ currentRole }}
            </UBadge>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
              必要な権限:
            </span>
            <UBadge color="warning" variant="subtle">
              {{ requiredRole }}
            </UBadge>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-4">
            {{ roleGuidance }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <UButton
            variant="outline"
            size="lg"
            icon="i-heroicons-envelope"
            class="w-full sm:w-auto"
            @click="handleRequestAccess"
          >
            権限をリクエスト
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

        <!-- Support Contact -->
        <p class="text-sm text-gray-500 dark:text-gray-500">
          権限に関するご質問は管理者にお問い合わせください。<br>
          <a
            :href="`mailto:${supportEmail}`"
            class="text-primary-600 dark:text-primary-400 hover:underline"
          >
            {{ supportEmail }}
          </a>
        </p>
      </div>
    </div>
  </div>
</template>
