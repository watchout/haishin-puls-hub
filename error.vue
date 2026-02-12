<!-- error.vue -->
<!-- ERR-001-003: グローバルエラーハンドラ -->
<!-- 仕様書: docs/design/features/common/ERR-001-003_error-pages.md §11.1 -->
<!--
  Nuxt 3 のグローバルエラーページ。
  statusCode に応じて適切なエラーコンポーネントを動的に選択する。
  401 エラーはエラーページを表示せず、ログインページへ自動リダイレクトする。
-->

<script setup lang="ts">
import type { NuxtError } from '#app'
import Error404 from '~/components/error/Error404.vue'
import Error403 from '~/components/error/Error403.vue'
import Error500 from '~/components/error/Error500.vue'

const props = defineProps<{
  error: NuxtError
}>()

// FR-004: 401エラーは自動リダイレクト
if (props.error.statusCode === 401) {
  // SSR/CSR 両方で動作するよう navigateTo を使用
  const redirectPath = import.meta.client ? window.location.pathname : '/'
  await navigateTo({
    path: '/login',
    query: { redirect: redirectPath },
  })
}

// エラーページコンポーネントを動的に選択
const errorComponent = computed(() => {
  switch (props.error.statusCode) {
    case 404:
      return Error404
    case 403:
      return Error403
    default:
      // 500, 503, その他5xx/4xx は全て Error500 にフォールバック
      return Error500
  }
})

// BR-004: SEO — noindex, nofollow
useHead({
  title: `エラー ${props.error.statusCode} | Haishin+ HUB`,
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
  ],
})
</script>

<template>
  <div>
    <component
      :is="errorComponent"
      :error="error"
    />
  </div>
</template>
