<script setup lang="ts">
// AUTH-001 ログインページ
// auth レイアウト使用、LoginForm コンポーネント配置

definePageMeta({
  layout: 'auth',
});

const { handleOAuthCallback } = useAuth();

// OAuth コールバック処理
const route = useRoute();
const oauthError = ref('');

onMounted(async () => {
  if (route.query.oauth || route.query.error) {
    const result = await handleOAuthCallback();
    if (!result.success && result.error) {
      oauthError.value = result.error;
    }
  }
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-center mb-8">
      ログイン
    </h1>

    <!-- OAuth エラー表示 -->
    <UAlert
      v-if="oauthError"
      :description="oauthError"
      color="warning"
      icon="i-lucide-alert-triangle"
      variant="soft"
      class="mb-6"
      :close="{
        color: 'warning',
        variant: 'link',
      }"
      @update:open="oauthError = ''"
    />

    <LoginForm />
  </div>
</template>
