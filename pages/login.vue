<script setup lang="ts">
// AUTH-001 ログインページ
// auth レイアウト使用、LoginForm コンポーネント配置

definePageMeta({
  layout: 'auth',
});

const { handleOAuthCallback } = useAuth();
const toast = useToast();

// OAuth コールバック / ログアウトトースト処理
const route = useRoute();
const router = useRouter();
const oauthError = ref('');

onMounted(async () => {
  // AUTH-005: ログアウト後のトースト表示
  if (route.query.reason === 'logout') {
    toast.add({
      title: 'ログアウトしました',
      icon: 'i-lucide-log-out',
      color: 'success',
    });
    // URLからクエリパラメータを除去
    router.replace({ path: '/login', query: {} });
  }

  // OAuth コールバック処理
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
