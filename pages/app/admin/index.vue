<script setup lang="ts">
// 管理者ダッシュボード
// AUTH-001 §2.1: system_admin のデフォルトリダイレクト先

definePageMeta({
  layout: 'dashboard',
});

const { user, currentTenant, currentRole } = useAuth();
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold">
        管理者ダッシュボード
      </h1>
      <p class="text-sm text-gray-500 mt-1">
        システム管理
      </p>
    </div>

    <UCard>
      <div class="text-center py-8">
        <div class="text-4xl mb-4">
          ⚙️
        </div>
        <h2 class="text-xl font-semibold mb-2">
          管理者メニュー
        </h2>
        <p class="text-gray-500">
          {{ user?.name ?? 'ユーザー' }}さん（{{ currentRole }}）
        </p>
        <p class="text-sm text-gray-400 mt-1">
          {{ currentTenant?.name ?? '-' }}
        </p>
      </div>
    </UCard>
  </div>
</template>
