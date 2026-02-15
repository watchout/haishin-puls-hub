<script setup lang="ts">
// ダッシュボードトップページ（暫定版）
// AUTH-001 §2.1: tenant_admin / organizer 等のデフォルトリダイレクト先
// NOTE: dashboard レイアウトはコンポーネント依存の問題があるため暫定で default を使用

definePageMeta({
  layout: 'default',
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <div class="max-w-4xl mx-auto p-6 space-y-6">
      <!-- ヘッダー -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">
            ダッシュボード
          </h1>
          <p class="text-sm text-gray-500 mt-1">
            Haishin+ HUB
          </p>
        </div>
        <UButton to="/login?reason=logout" variant="outline" size="sm">
          ログアウト
        </UButton>
      </div>

      <!-- ウェルカムカード -->
      <UCard>
        <div class="text-center py-8">
          <div class="text-4xl mb-4">
            👋
          </div>
          <h2 class="text-xl font-semibold mb-2">
            ログイン成功！
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
  </div>
</template>
