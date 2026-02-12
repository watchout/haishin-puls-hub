<!-- components/error/Error500.vue -->
<!-- ERR-003: 500 Server Error ページ -->
<!-- 仕様書: docs/design/features/common/ERR-001-003_error-pages.md §6.3 -->

<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const config = useRuntimeConfig()
const supportEmail = computed(() => config.public.supportEmail || 'support@example.com')

const requestId = computed(() => {
  return (props.error.data as Record<string, string> | undefined)?.requestId || 'N/A'
})

const retryable = computed(() => {
  const data = props.error.data as Record<string, boolean> | undefined
  return data?.retryable !== false
})

const isRetrying = ref(false)

const handleRetry = async () => {
  isRetrying.value = true
  // UX: 一瞬待ってからリロード
  await new Promise(resolve => setTimeout(resolve, 500))
  if (import.meta.client) {
    window.location.reload()
  }
}

const copyErrorId = async () => {
  if (import.meta.client && navigator.clipboard) {
    await navigator.clipboard.writeText(requestId.value)
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
            name="i-heroicons-exclamation-triangle"
            class="w-24 h-24 mx-auto text-red-400 dark:text-red-600"
          />
        </div>

        <!-- Title -->
        <h1
          class="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100"
          role="alert"
          aria-live="assertive"
        >
          サーバーエラーが発生しました
        </h1>

        <!-- Description -->
        <p class="text-base mb-8 text-gray-600 dark:text-gray-400">
          申し訳ございません。一時的な問題が発生しました。<br>
          しばらくしてから再度お試しください。
        </p>

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <UButton
            v-if="retryable"
            variant="outline"
            size="lg"
            icon="i-heroicons-arrow-path"
            :loading="isRetrying"
            class="w-full sm:w-auto"
            @click="handleRetry"
          >
            再試行
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

        <!-- Error Info -->
        <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-left max-w-md mx-auto">
          <h2 class="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300">
            問題が解決しない場合
          </h2>
          <div class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div class="flex items-start gap-2">
              <span class="font-medium min-w-24">エラーID:</span>
              <button
                class="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                :title="`コピー: ${requestId}`"
                @click="copyErrorId"
              >
                {{ requestId }}
              </button>
            </div>
            <div class="flex items-start gap-2">
              <span class="font-medium min-w-24">サポート:</span>
              <a
                :href="`mailto:${supportEmail}?subject=エラー報告 (ID: ${requestId})`"
                class="text-primary-600 dark:text-primary-400 hover:underline"
              >
                {{ supportEmail }}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
