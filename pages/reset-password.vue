<script setup lang="ts">
// AUTH-006: パスワードリセット実行ページ
// SSOT: docs/design/features/common/AUTH-006-010_better-auth.md §3.2 SCR-RESET
// URL: /reset-password?token=xxx

import { z } from 'zod';
import type { FormSubmitEvent } from '@nuxt/ui';

definePageMeta({
  layout: 'auth',
});

const { resetPassword } = useAuth();
const router = useRouter();
const route = useRoute();
const toast = useToast();

const token = computed(() => route.query.token as string | undefined);

const resetPasswordSchema = z.object({
  password: z
    .string({ required_error: 'パスワードを入力してください' })
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(128),
  passwordConfirm: z
    .string({ required_error: 'パスワード（確認）を入力してください' })
    .min(1, 'パスワード（確認）を入力してください'),
}).refine((data) => data.password === data.passwordConfirm, {
  message: 'パスワードが一致しません',
  path: ['passwordConfirm'],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

const state = reactive<ResetPasswordForm>({
  password: '',
  passwordConfirm: '',
});

const isSubmitting = ref(false);
const errorMessage = ref('');
const showPassword = ref(false);
const showPasswordConfirm = ref(false);

// トークンがない場合はエラー
const hasToken = computed(() => !!token.value);

// §8.1: トークンエラー時に再リクエストリンクを表示するか
const showRetryLink = ref(false);

async function onSubmit(event: FormSubmitEvent<ResetPasswordForm>) {
  if (!token.value) return;

  isSubmitting.value = true;
  errorMessage.value = '';
  showRetryLink.value = false;

  const result = await resetPassword(token.value, event.data.password);

  if (result.success) {
    // §7.1: 成功 → /login にリダイレクト + トースト（AC-006-006）
    toast.add({
      title: 'パスワードが更新されました',
      description: '新しいパスワードでログインしてください',
      icon: 'i-lucide-check-circle',
      color: 'success',
    });
    await router.push('/login');
  } else if (result.error) {
    errorMessage.value = result.error;
    // トークン系エラーの場合は再リクエストリンクを表示
    showRetryLink.value = true;
  }

  isSubmitting.value = false;
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-center mb-8">
      新しいパスワードを設定
    </h1>

    <!-- トークンなしエラー -->
    <div v-if="!hasToken" class="space-y-4">
      <UAlert
        description="パスワードリセットリンクが無効です。メール内のリンクをもう一度クリックしてください。"
        color="error"
        icon="i-lucide-alert-circle"
        variant="soft"
      />
      <div class="text-center">
        <NuxtLink
          to="/forgot-password"
          class="text-primary font-medium hover:underline"
        >
          パスワードリセットをやり直す
        </NuxtLink>
      </div>
    </div>

    <!-- リセットフォーム -->
    <div v-else class="space-y-6">
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

      <!-- §8.1: トークンエラー時の再リクエストリンク -->
      <div v-if="showRetryLink" class="text-center">
        <NuxtLink
          to="/forgot-password"
          class="text-sm text-primary hover:underline"
        >
          パスワードリセットをやり直す
        </NuxtLink>
      </div>

      <UForm
        :schema="resetPasswordSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="新しいパスワード" name="password" required>
          <UInput
            v-model="state.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="8文字以上"
            icon="i-lucide-lock"
            autocomplete="new-password"
            size="lg"
            class="w-full"
            :ui="{ trailing: 'pe-1' }"
          >
            <template #trailing>
              <UButton
                :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                color="neutral"
                variant="ghost"
                size="xs"
                @click="showPassword = !showPassword"
              />
            </template>
          </UInput>
        </UFormField>

        <UFormField label="新しいパスワード（確認）" name="passwordConfirm" required>
          <UInput
            v-model="state.passwordConfirm"
            :type="showPasswordConfirm ? 'text' : 'password'"
            placeholder="パスワードを再入力"
            icon="i-lucide-lock"
            autocomplete="new-password"
            size="lg"
            class="w-full"
            :ui="{ trailing: 'pe-1' }"
          >
            <template #trailing>
              <UButton
                :icon="showPasswordConfirm ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                color="neutral"
                variant="ghost"
                size="xs"
                @click="showPasswordConfirm = !showPasswordConfirm"
              />
            </template>
          </UInput>
        </UFormField>

        <UButton
          type="submit"
          size="lg"
          class="w-full"
          :loading="isSubmitting"
        >
          {{ isSubmitting ? '更新中...' : 'パスワードを更新' }}
        </UButton>
      </UForm>
    </div>
  </div>
</template>
