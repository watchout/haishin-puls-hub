<script setup lang="ts">
// AUTH-007: メール認証完了ページ
// Better Auth が /api/auth/verify-email を処理後にリダイレクト
// このページは認証結果を表示するだけ

definePageMeta({
  layout: 'auth',
});

const route = useRoute();
const { isAuthenticated } = useAuth();

// クエリパラメータから結果を判定
const isSuccess = computed(() => route.query.error === undefined);
const errorMessage = computed(() => {
  const error = route.query.error as string | undefined;
  if (!error) return '';
  if (error === 'token_expired') return 'メール認証リンクの有効期限が切れています';
  if (error === 'token_invalid') return 'メール認証リンクが無効です';
  return 'メール認証に失敗しました';
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-center mb-8">
      メール認証
    </h1>

    <!-- 成功 -->
    <div v-if="isSuccess" class="space-y-4">
      <UAlert
        title="メールアドレスが確認されました"
        description="メールアドレスの確認が完了しました。"
        color="success"
        icon="i-lucide-check-circle"
        variant="soft"
      />
      <div class="text-center">
        <NuxtLink
          :to="isAuthenticated ? '/app' : '/login'"
          class="text-primary font-medium hover:underline"
        >
          {{ isAuthenticated ? 'ダッシュボードへ' : 'ログインへ' }}
        </NuxtLink>
      </div>
    </div>

    <!-- エラー -->
    <div v-else class="space-y-4">
      <UAlert
        :description="errorMessage"
        color="error"
        icon="i-lucide-alert-circle"
        variant="soft"
      />
      <div class="text-center">
        <NuxtLink
          :to="isAuthenticated ? '/app' : '/login'"
          class="text-primary font-medium hover:underline"
        >
          {{ isAuthenticated ? 'ダッシュボードへ' : 'ログインへ' }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
