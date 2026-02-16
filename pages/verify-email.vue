<script setup lang="ts">
// AUTH-007: メール認証コールバックページ
// SSOT: docs/design/features/common/AUTH-006-010_better-auth.md §7.2
//
// Better Auth が /api/auth/verify-email を処理後にこのページへリダイレクト
// autoSignInAfterVerification: true のため、認証成功時は自動ログイン済み
// このページはトースト表示 + ダッシュボードへの遷移を担当

import { EMAIL_VERIFICATION_ERROR_MESSAGES } from '~/types/auth';

definePageMeta({
  layout: 'auth',
});

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { isAuthenticated, fetchSession } = useAuth();

// クエリパラメータから結果を判定
const isSuccess = computed(() => route.query.error === undefined);
const errorMessage = computed(() => {
  const error = route.query.error as string | undefined;
  if (!error) return '';
  if (error === 'token_expired') return EMAIL_VERIFICATION_ERROR_MESSAGES.TOKEN_EXPIRED;
  if (error === 'token_invalid' || error === 'INVALID_TOKEN') return EMAIL_VERIFICATION_ERROR_MESSAGES.INVALID_TOKEN;
  return 'メール認証に失敗しました';
});

// §7.2: 認証成功時はトースト + /app リダイレクト
onMounted(async () => {
  if (isSuccess.value) {
    // セッションを再取得（emailVerified が更新されているため）
    await fetchSession();

    toast.add({
      title: EMAIL_VERIFICATION_ERROR_MESSAGES.VERIFIED,
      icon: 'i-lucide-check-circle',
      color: 'success',
    });

    // ログイン済みなら /app へ、未ログインなら /login へ
    if (isAuthenticated.value) {
      await router.push('/app');
    }
  }
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-center mb-8">
      メール認証
    </h1>

    <!-- 成功（一時的に表示、すぐにリダイレクト） -->
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

    <!-- エラー（§8.1: トークン期限切れ/不正） -->
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
