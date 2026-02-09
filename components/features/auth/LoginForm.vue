<script setup lang="ts">
// AUTH-001 §3 UI仕様に基づくログインフォーム
// Nuxt UI v3 + Zod バリデーション

import type { FormSubmitEvent } from '@nuxt/ui';
import { loginSchema } from '~/types/auth';
import type { LoginFormValues } from '~/types/auth';

const { login, loginWithGoogle } = useAuth();

// ──────────────────────────────────────
// State
// ──────────────────────────────────────

const state = reactive<LoginFormValues>({
  email: '',
  password: '',
  rememberMe: false,
});

const isSubmitting = ref(false);
const isGoogleLoading = ref(false);
const errorMessage = ref('');
const showPassword = ref(false);

// ──────────────────────────────────────
// Handlers
// ──────────────────────────────────────

/** メール/パスワード ログイン送信 */
async function onSubmit(event: FormSubmitEvent<LoginFormValues>) {
  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    const result = await login(event.data);

    if (!result.success && result.error) {
      errorMessage.value = result.error;
    }
  } finally {
    isSubmitting.value = false;
  }
}

/** Google OAuth ログイン */
async function onGoogleLogin() {
  isGoogleLoading.value = true;
  errorMessage.value = '';

  try {
    await loginWithGoogle();
  } catch {
    errorMessage.value = 'Google ログインに失敗しました';
    isGoogleLoading.value = false;
  }
}

/** パスワード表示/非表示トグル */
function togglePasswordVisibility() {
  showPassword.value = !showPassword.value;
}
</script>

<template>
  <div class="space-y-6">
    <!-- エラーバナー -->
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

    <!-- ログインフォーム -->
    <UForm
      :schema="loginSchema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
      <!-- メールアドレス -->
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

      <!-- パスワード -->
      <UFormField label="パスワード" name="password" required>
        <UInput
          v-model="state.password"
          :type="showPassword ? 'text' : 'password'"
          placeholder="パスワードを入力"
          icon="i-lucide-lock"
          autocomplete="current-password"
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
              @click="togglePasswordVisibility"
            />
          </template>
        </UInput>
      </UFormField>

      <!-- ログイン状態を保持 -->
      <UCheckbox
        v-model="state.rememberMe"
        label="ログイン状態を保持する"
      />

      <!-- ログインボタン -->
      <UButton
        type="submit"
        size="lg"
        class="w-full"
        :loading="isSubmitting"
      >
        {{ isSubmitting ? 'ログイン中...' : 'ログイン' }}
      </UButton>
    </UForm>

    <!-- パスワード忘れリンク -->
    <div class="text-center">
      <NuxtLink
        to="/forgot-password"
        class="text-sm text-primary hover:underline"
      >
        パスワードをお忘れですか？
      </NuxtLink>
    </div>

    <!-- 区切り線 -->
    <div class="relative">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-gray-200 dark:border-gray-700" />
      </div>
      <div class="relative flex justify-center text-sm">
        <span class="bg-white dark:bg-gray-900 px-4 text-gray-500">
          または
        </span>
      </div>
    </div>

    <!-- Google ログインボタン -->
    <UButton
      variant="outline"
      color="neutral"
      size="lg"
      class="w-full"
      icon="i-simple-icons-google"
      :loading="isGoogleLoading"
      @click="onGoogleLogin"
    >
      {{ isGoogleLoading ? '処理中...' : 'Google でログイン' }}
    </UButton>

    <!-- 新規登録リンク -->
    <p class="text-center text-sm text-gray-500">
      アカウントをお持ちでない方
      <NuxtLink
        to="/signup"
        class="text-primary font-medium hover:underline"
      >
        新規登録
      </NuxtLink>
    </p>
  </div>
</template>
