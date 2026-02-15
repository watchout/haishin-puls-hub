<script setup lang="ts">
// イベント一覧ページ（/app/events）
// AUTH-001 §2.1: speaker / participant / vendor のデフォルトリダイレクト先

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth'],
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">
        イベント一覧
      </h1>
      <UButton icon="i-lucide-plus" size="sm">
        新規作成
      </UButton>
    </div>

    <UCard>
      <div class="text-center py-12 text-gray-500">
        <div class="text-4xl mb-4">
          📅
        </div>
        <p>イベントはまだありません</p>
        <p class="text-sm mt-1">
          「新規作成」ボタンからイベントを作成してください
        </p>
      </div>
    </UCard>
  </div>
</template>
