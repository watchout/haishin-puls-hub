<script setup lang="ts">
// AUTH-006: パスワードリセット依頼ページ
// SSOT: docs/design/features/common/AUTH-006-010_better-auth.md §3.2 SCR-FORGOT

import { z } from 'zod';
import type { FormSubmitEvent } from '@nuxt/ui';

definePageMeta({
  layout: 'auth',
});

const { requestPasswordReset } = useAuth();

const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'メールアドレスを入力してください' })
    .min(1, 'メールアドレスを入力してください')
    .email('有効なメールアドレスを入力してください')
    .max(255),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

const state = reactive<ForgotPasswordForm>({
  email: '',
});

const isSubmitting = ref(false);
const isSuccess = ref(false);
const errorMessage = ref('');

async function onSubmit(event: FormSubmitEvent<ForgotPasswordForm>) {
  isSubmitting.value = true;
  errorMessage.value = '';

  const result = await requestPasswordReset(event.data.email);

  if (result.success) {
    // §7.1: 登録済み・未登録に関わらず同じ成功メッセージ（情報漏洩防止）
    isSuccess.value = true;
  } else if (result.error) {
    errorMessage.value = result.error;
  }

  isSubmitting.value = false;
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-center mb-8">
      パスワードリセット
    </h1>

    <!-- 送信成功（§3.4 SCR-FORGOT 送信完了状態） -->
    <div v-if="isSuccess" class="space-y-4">
      <UAlert
        title="メールを送信しました"
        description="パスワードリセットの手順をメールでお送りしました。メールをご確認ください。"
        color="success"
        icon="i-lucide-mail-check"
        variant="soft"
      />
      <p class="text-center text-sm text-gray-500">
        メールが届かない場合は、迷惑メールフォルダをご確認ください。
      </p>
      <div class="text-center">
        <NuxtLink
          to="/login"
          class="text-primary font-medium hover:underline"
        >
          ログインに戻る
        </NuxtLink>
      </div>
    </div>

    <!-- フォーム -->
    <div v-else class="space-y-6">
      <p class="text-sm text-gray-500 text-center">
        登録済みのメールアドレスを入力してください。パスワードリセットの手順をお送りします。
      </p>

      <UAlert
        v-if="errorMessage"
        :description="errorMessage"
        color="error"
        icon="i-lucide-alert-circle"
        variant="soft"
        :close="{
          color: 'error',
          variant: 'link',
        }"
        @update:open="errorMessage = ''"
      />

      <UForm
        :schema="forgotPasswordSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="メールアドレス" name="email" required>
          <UInput
            v-model="state.email"
            type="email"
            placeholder="example@email.com"
            icon="i-lucide-mail"
            autocomplete="email"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UButton
          type="submit"
          size="lg"
          class="w-full"
          :loading="isSubmitting"
        >
          {{ isSubmitting ? '送信中...' : 'リセットメールを送信' }}
        </UButton>
      </UForm>

      <div class="text-center">
        <NuxtLink
          to="/login"
          class="text-sm text-primary hover:underline"
        >
          ログインに戻る
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
