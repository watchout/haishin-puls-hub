<script setup lang="ts">
// ダッシュボードトップページ
// AUTH-001 §2.1: tenant_admin / organizer 等のデフォルトリダイレクト先

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth'],
});

const { user, currentTenant, currentRole } = useAuth();
</script>

<template>
  <div class="space-y-6">
    <!-- ヘッダー -->
    <div>
      <h1 class="text-2xl font-bold">
        ダッシュボード
      </h1>
      <p class="text-sm text-gray-500 mt-1">
        {{ currentTenant?.name ?? 'テナント未選択' }}
      </p>
    </div>

    <!-- ウェルカムカード -->
    <UCard>
      <div class="text-center py-8">
        <div class="text-4xl mb-4">
          👋
        </div>
        <h2 class="text-xl font-semibold mb-2">
          ようこそ、{{ user?.name ?? 'ユーザー' }}さん
        </h2>
        <p class="text-gray-500">
          Haishin+ HUB へログインしました。
        </p>
        <div class="mt-4 flex gap-2 justify-center flex-wrap">
          <UBadge color="primary" variant="soft">
            ロール: {{ currentRole ?? '未設定' }}
          </UBadge>
          <UBadge color="neutral" variant="soft">
            テナント: {{ currentTenant?.slug ?? '-' }}
          </UBadge>
        </div>
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
          <UButton to="/app/events" variant="soft" class="mt-3" size="sm">
            イベント一覧へ
          </UButton>
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
          <UButton to="/admin/venues" variant="soft" class="mt-3" size="sm">
            会場一覧へ
          </UButton>
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
          <UButton variant="soft" class="mt-3" size="sm">
            チャットを開く
          </UButton>
        </div>
      </UCard>
    </div>
  </div>
</template>
