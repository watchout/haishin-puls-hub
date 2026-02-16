<script setup lang="ts">
// ダッシュボードトップページ
// AUTH-001 §2.1: tenant_admin / organizer 等のデフォルトリダイレクト先
// NAV-001-002-006: dashboard レイアウト使用（ヘッダー + サイドバー）

definePageMeta({
  layout: 'dashboard',
});
</script>

<template>
  <div class="space-y-6">
    <!-- ウェルカムカード -->
    <UCard>
      <div class="text-center py-8">
        <div class="text-4xl mb-4">
          👋
        </div>
        <h2 class="text-xl font-semibold mb-2">
          ようこそ！
        </h2>
        <p class="text-gray-500">
          Haishin+ HUB へようこそ。
        </p>
      </div>
    </UCard>

    <!-- クイックアクション -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard>
        <div class="text-center">
          <div class="text-2xl mb-2">
            📅
          </div>
          <h3 class="font-semibold">
            イベント管理
          </h3>
          <p class="text-sm text-gray-500 mt-1">
            イベントの作成・管理
          </p>
        </div>
      </UCard>

      <UCard>
        <div class="text-center">
          <div class="text-2xl mb-2">
            🏢
          </div>
          <h3 class="font-semibold">
            会場管理
          </h3>
          <p class="text-sm text-gray-500 mt-1">
            会場の登録・管理
          </p>
        </div>
      </UCard>

      <UCard>
        <div class="text-center">
          <div class="text-2xl mb-2">
            🤖
          </div>
          <h3 class="font-semibold">
            AIアシスタント
          </h3>
          <p class="text-sm text-gray-500 mt-1">
            AIに相談・依頼
          </p>
        </div>
      </UCard>
    </div>
  </div>
</template>
