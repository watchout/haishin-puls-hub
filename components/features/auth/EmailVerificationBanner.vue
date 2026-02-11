<script setup lang="ts">
// AUTH-007: メール未確認時のダッシュボードバナー
// user.emailVerified === false の場合に表示

import { authClient } from '~/lib/auth-client';

const { user } = useAuth();
const toast = useToast();

const isResending = ref(false);
const isDismissed = ref(false);

const shouldShow = computed(() =>
  !isDismissed.value && user.value && !user.value.emailVerified,
);

async function resendVerification() {
  isResending.value = true;

  try {
    await authClient.sendVerificationEmail({
      email: user.value!.email,
      callbackURL: '/verify-email',
    });

    toast.add({
      title: '確認メールを送信しました',
      description: 'メールをご確認ください',
      icon: 'i-lucide-mail-check',
      color: 'success',
    });
  } catch {
    toast.add({
      title: 'メール送信に失敗しました',
      description: 'しばらく時間をおいて再試行してください',
      icon: 'i-lucide-alert-circle',
      color: 'error',
    });
  } finally {
    isResending.value = false;
  }
}
</script>

<template>
  <UAlert
    v-if="shouldShow"
    title="メールアドレスが確認されていません"
    description="確認メールをご確認いただくか、再送信してください。"
    color="warning"
    icon="i-lucide-mail-warning"
    variant="soft"
    :close="{
      color: 'warning',
      variant: 'link',
    }"
    @update:open="isDismissed = true"
  >
    <template #actions>
      <UButton
        size="xs"
        color="warning"
        variant="solid"
        :loading="isResending"
        @click="resendVerification"
      >
        再送信
      </UButton>
    </template>
  </UAlert>
</template>
