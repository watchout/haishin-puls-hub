<script setup lang="ts">
// ACCT-001 §3 UI仕様に基づくサインアップフォーム
// Nuxt UI v3 + Zod バリデーション
// 招待ベース / セルフ登録 / Google OAuth の3フロー対応

import type { FormSubmitEvent } from '@nuxt/ui';
import { signupSchema, invitationAcceptSchema } from '~/types/auth';
import type { SignupFormValues, InvitationAcceptFormValues, InvitationInfoResponse } from '~/types/auth';

// ──────────────────────────────────────
// Props
// ──────────────────────────────────────

const props = defineProps<{
  invitation?: InvitationInfoResponse['data'] | null;
}>();

const { signup, signupWithInvitation, signupWithGoogle } = useAuth();

// ──────────────────────────────────────
// State
// ──────────────────────────────────────

const isInvitation = computed(() => !!props.invitation);

// セルフ登録用ステート
const selfState = reactive<SignupFormValues>({
  name: '',
  email: '',
  password: '',
  passwordConfirm: '',
  termsAccepted: false,
});

// 招待用ステート
const inviteState = reactive<InvitationAcceptFormValues>({
  name: '',
  password: '',
  passwordConfirm: '',
  termsAccepted: false,
});

const isSubmitting = ref(false);
const isGoogleLoading = ref(false);
const errorMessage = ref('');
const showPassword = ref(false);
const showPasswordConfirm = ref(false);

// パスワード強度（ACCT-001 §3.4）
const currentPassword = computed(() =>
  isInvitation.value ? inviteState.password : selfState.password,
);

const passwordStrength = computed(() => {
  const pw = currentPassword.value;
  if (!pw || pw.length < 8) return { level: 0, label: '', color: '' as const };

  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSymbol = /[^a-zA-Z0-9]/.test(pw);

  if (hasUpper && hasNumber && hasSymbol) {
    return { level: 3, label: '強', color: 'success' as const };
  }
  if (hasUpper || hasNumber) {
    return { level: 2, label: '中', color: 'warning' as const };
  }
  return { level: 1, label: '弱', color: 'error' as const };
});

// ロール名の日本語マッピング
const roleDisplayMap: Record<string, string> = {
  system_admin: 'システム管理者',
  tenant_admin: 'テナント管理者',
  organizer: '主催者',
  venue_staff: '会場スタッフ',
  streaming_provider: '配信業者',
  event_planner: 'イベント企画',
  speaker: '登壇者',
  sales_marketing: '営業マーケ',
  participant: '参加者',
  vendor: '関連業者',
};

// ──────────────────────────────────────
// Handlers
// ──────────────────────────────────────

/** セルフ登録サインアップ送信 */
async function onSelfSubmit(event: FormSubmitEvent<SignupFormValues>) {
  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    const result = await signup(event.data);
    if (!result.success && result.error) {
      errorMessage.value = result.error;
    }
  } finally {
    isSubmitting.value = false;
  }
}

/** 招待ベースサインアップ送信 */
async function onInviteSubmit(event: FormSubmitEvent<InvitationAcceptFormValues>) {
  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    const result = await signupWithInvitation(event.data);
    if (!result.success && result.error) {
      errorMessage.value = result.error;
    }
  } finally {
    isSubmitting.value = false;
  }
}

/** Google OAuth サインアップ */
async function onGoogleSignup() {
  isGoogleLoading.value = true;
  errorMessage.value = '';

  try {
    await signupWithGoogle();
  } catch {
    errorMessage.value = 'Google サインアップに失敗しました';
    isGoogleLoading.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- 招待情報バナー（ACCT-001 §3.3） -->
    <UAlert
      v-if="invitation"
      color="info"
      icon="i-lucide-mail"
      variant="soft"
      :title="`「${invitation.tenant.name}」から招待されています`"
      :description="`ロール: ${roleDisplayMap[invitation.role] ?? invitation.role}`"
    />

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

    <!-- 招待ベースフォーム -->
    <UForm
      v-if="isInvitation"
      :schema="invitationAcceptSchema"
      :state="inviteState"
      class="space-y-4"
      @submit="onInviteSubmit"
    >
      <!-- 名前 -->
      <UFormField label="名前" name="name" required>
        <UInput
          v-model="inviteState.name"
          placeholder="山田 太郎"
          icon="i-lucide-user"
          autocomplete="name"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <!-- メールアドレス（プリフィル・編集不可） -->
      <UFormField label="メールアドレス" name="email">
        <UInput
          :model-value="invitation?.email"
          type="email"
          icon="i-lucide-mail"
          size="lg"
          class="w-full"
          disabled
        />
      </UFormField>

      <!-- パスワード -->
      <UFormField label="パスワード" name="password" required>
        <UInput
          v-model="inviteState.password"
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

      <!-- パスワード強度インジケーター -->
      <div v-if="passwordStrength.level > 0" class="flex items-center gap-2">
        <div class="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-300"
            :class="{
              'bg-red-500 w-1/3': passwordStrength.level === 1,
              'bg-yellow-500 w-2/3': passwordStrength.level === 2,
              'bg-green-500 w-full': passwordStrength.level === 3,
            }"
          />
        </div>
        <span
          class="text-xs font-medium"
          :class="{
            'text-red-500': passwordStrength.level === 1,
            'text-yellow-500': passwordStrength.level === 2,
            'text-green-500': passwordStrength.level === 3,
          }"
        >
          {{ passwordStrength.label }}
        </span>
      </div>

      <!-- パスワード（確認） -->
      <UFormField label="パスワード（確認）" name="passwordConfirm" required>
        <UInput
          v-model="inviteState.passwordConfirm"
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

      <!-- 利用規約同意 -->
      <UCheckbox
        v-model="inviteState.termsAccepted"
        name="termsAccepted"
      >
        <template #label>
          <span class="text-sm">
            <NuxtLink to="/terms" class="text-primary hover:underline" target="_blank">利用規約</NuxtLink>
            と
            <NuxtLink to="/privacy" class="text-primary hover:underline" target="_blank">プライバシーポリシー</NuxtLink>
            に同意する
          </span>
        </template>
      </UCheckbox>

      <!-- 登録ボタン -->
      <UButton
        type="submit"
        size="lg"
        class="w-full"
        :loading="isSubmitting"
      >
        {{ isSubmitting ? 'アカウント作成中...' : 'アカウントを作成' }}
      </UButton>
    </UForm>

    <!-- セルフ登録フォーム -->
    <UForm
      v-else
      :schema="signupSchema"
      :state="selfState"
      class="space-y-4"
      @submit="onSelfSubmit"
    >
      <!-- 名前 -->
      <UFormField label="名前" name="name" required>
        <UInput
          v-model="selfState.name"
          placeholder="山田 太郎"
          icon="i-lucide-user"
          autocomplete="name"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <!-- メールアドレス -->
      <UFormField label="メールアドレス" name="email" required>
        <UInput
          v-model="selfState.email"
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
          v-model="selfState.password"
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

      <!-- パスワード強度インジケーター -->
      <div v-if="passwordStrength.level > 0" class="flex items-center gap-2">
        <div class="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-300"
            :class="{
              'bg-red-500 w-1/3': passwordStrength.level === 1,
              'bg-yellow-500 w-2/3': passwordStrength.level === 2,
              'bg-green-500 w-full': passwordStrength.level === 3,
            }"
          />
        </div>
        <span
          class="text-xs font-medium"
          :class="{
            'text-red-500': passwordStrength.level === 1,
            'text-yellow-500': passwordStrength.level === 2,
            'text-green-500': passwordStrength.level === 3,
          }"
        >
          {{ passwordStrength.label }}
        </span>
      </div>

      <!-- パスワード（確認） -->
      <UFormField label="パスワード（確認）" name="passwordConfirm" required>
        <UInput
          v-model="selfState.passwordConfirm"
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

      <!-- 利用規約同意 -->
      <UCheckbox
        v-model="selfState.termsAccepted"
        name="termsAccepted"
      >
        <template #label>
          <span class="text-sm">
            <NuxtLink to="/terms" class="text-primary hover:underline" target="_blank">利用規約</NuxtLink>
            と
            <NuxtLink to="/privacy" class="text-primary hover:underline" target="_blank">プライバシーポリシー</NuxtLink>
            に同意する
          </span>
        </template>
      </UCheckbox>

      <!-- 登録ボタン -->
      <UButton
        type="submit"
        size="lg"
        class="w-full"
        :loading="isSubmitting"
      >
        {{ isSubmitting ? 'アカウント作成中...' : 'アカウントを作成' }}
      </UButton>
    </UForm>

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

    <!-- Google 登録ボタン -->
    <UButton
      variant="outline"
      color="neutral"
      size="lg"
      class="w-full"
      icon="i-simple-icons-google"
      :loading="isGoogleLoading"
      @click="onGoogleSignup"
    >
      {{ isGoogleLoading ? '処理中...' : 'Google で登録' }}
    </UButton>

    <!-- ログインリンク -->
    <p class="text-center text-sm text-gray-500">
      すでにアカウントをお持ちの方
      <NuxtLink
        to="/login"
        class="text-primary font-medium hover:underline"
      >
        ログイン
      </NuxtLink>
    </p>
  </div>
</template>
