<!-- pages/dashboard/profile/index.vue -->
<!-- ACCT-002: プロフィール表示画面 (SCR-PROFILE) -->
<!-- 仕様書: docs/design/features/common/ACCT-002_profile-view.md §3 -->

<script setup lang="ts">
import {
  getInitials,
  getRoleLabel,
  formatRelativeTime,
  formatAbsoluteTime,
} from '~/composables/useProfile'

definePageMeta({
  layout: 'dashboard',
})

const authStore = useAuthStore()
const {
  tenants,
  isLoadingTenants,
  tenantError,
  isResendingEmail,
  fetchTenants,
  resendVerificationEmail,
} = useProfile()

// ──────────────────────────────────────
// ユーザー情報
// ──────────────────────────────────────

const user = computed(() => authStore.user)
const isEmailVerified = computed(() => user.value?.emailVerified ?? false)
const avatarUrl = computed(() => user.value?.image ?? null)
const userName = computed(() => user.value?.name ?? '')
const userEmail = computed(() => user.value?.email ?? '')

/** アバターフォールバック (§3.4) */
const avatarInitials = computed(() => {
  if (userName.value) return getInitials(userName.value)
  return ''
})

/** 最終ログイン表示 */
const lastLoginRelative = computed(() =>
  formatRelativeTime((user.value as Record<string, unknown> | null)?.lastLoginAt as string | null),
)
const lastLoginAbsolute = computed(() =>
  formatAbsoluteTime((user.value as Record<string, unknown> | null)?.lastLoginAt as string | null),
)

// ──────────────────────────────────────
// ナビゲーション
// ──────────────────────────────────────

const router = useRouter()

function goToEditProfile() {
  router.push('/dashboard/profile/edit')
}

function goToChangePassword() {
  router.push('/dashboard/profile/password')
}

async function handleResendEmail() {
  if (userEmail.value) {
    await resendVerificationEmail(userEmail.value)
  }
}

// ──────────────────────────────────────
// 初回ロード
// ──────────────────────────────────────

onMounted(() => {
  fetchTenants()
})
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Page Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        プロフィール
      </h1>
    </div>

    <!-- Email Verification Warning Banner (§3.3) -->
    <UAlert
      v-if="!isEmailVerified"
      color="warning"
      icon="i-heroicons-exclamation-triangle"
      title="メールアドレスが未認証です"
      description="メールに届いた認証リンクをクリックして、メールアドレスを認証してください。"
    >
      <template #actions>
        <UButton
          variant="outline"
          color="warning"
          size="xs"
          label="認証メールを再送する"
          :loading="isResendingEmail"
          @click="handleResendEmail"
        />
      </template>
    </UAlert>

    <!-- Basic Info Card (§3.2) -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          基本情報
        </h2>
      </template>

      <div class="flex items-start gap-6">
        <!-- Avatar (§3.4) -->
        <div class="shrink-0">
          <UAvatar
            v-if="avatarUrl"
            :src="avatarUrl"
            :alt="userName"
            size="xl"
          />
          <UAvatar
            v-else-if="avatarInitials"
            :text="avatarInitials"
            size="xl"
          />
          <UAvatar
            v-else
            icon="i-heroicons-user"
            size="xl"
          />
        </div>

        <!-- User Info -->
        <div class="flex-1 min-w-0">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white truncate">
            {{ userName || '名前未設定' }}
          </h2>

          <div class="flex items-center gap-2 mt-1">
            <p class="text-gray-600 dark:text-gray-400">
              {{ userEmail }}
            </p>
            <UBadge v-if="isEmailVerified" color="success" variant="subtle" size="xs">
              認証済み
            </UBadge>
          </div>

          <!-- Last Login (§7.3) -->
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            最終ログイン: {{ lastLoginRelative }}
            <span v-if="lastLoginAbsolute" class="text-gray-400 dark:text-gray-500">
              （{{ lastLoginAbsolute }}）
            </span>
          </p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-3 mt-6">
        <UButton
          label="プロフィール編集"
          icon="i-heroicons-pencil-square"
          @click="goToEditProfile"
        />
        <UButton
          variant="outline"
          color="neutral"
          label="パスワード変更"
          icon="i-heroicons-key"
          @click="goToChangePassword"
        />
      </div>
    </UCard>

    <!-- Tenant List Card (§3.2) -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          所属テナント
        </h2>
      </template>

      <!-- Loading -->
      <div v-if="isLoadingTenants" class="space-y-3">
        <USkeleton v-for="i in 2" :key="i" class="h-20 w-full" />
      </div>

      <!-- Error -->
      <UAlert
        v-else-if="tenantError"
        color="error"
        icon="i-heroicons-exclamation-circle"
        :title="tenantError"
      />

      <!-- Empty -->
      <p
        v-else-if="tenants.length === 0"
        class="text-center text-gray-500 dark:text-gray-400 py-4"
      >
        テナントに所属していません
      </p>

      <!-- Tenant Cards -->
      <div v-else class="space-y-3">
        <div
          v-for="t in tenants"
          :key="t.id"
          class="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
        >
          <div class="flex items-center gap-3 min-w-0">
            <UAvatar
              v-if="t.logo_url"
              :src="t.logo_url"
              :alt="t.name"
              size="sm"
            />
            <UAvatar
              v-else
              :text="t.name[0] ?? '?'"
              size="sm"
            />

            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium text-gray-900 dark:text-white truncate">
                  {{ t.name }}
                </span>
                <span v-if="t.is_default" class="text-yellow-500" title="デフォルトテナント">
                  ⭐
                </span>
              </div>
              <div class="flex items-center gap-2 mt-0.5">
                <UBadge color="primary" variant="subtle" size="xs">
                  {{ getRoleLabel(t.role) }}
                </UBadge>
                <span class="text-xs text-gray-400">
                  参加日: {{ new Date(t.joined_at).toLocaleDateString('ja-JP') }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Security Info Card (§3.2) -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          セキュリティ
        </h2>
      </template>

      <dl class="space-y-3">
        <div class="flex items-center justify-between">
          <dt class="text-sm text-gray-500 dark:text-gray-400">
            アカウント種別
          </dt>
          <dd class="text-sm font-medium text-gray-900 dark:text-white">
            メール/パスワード
          </dd>
        </div>
        <div class="flex items-center justify-between">
          <dt class="text-sm text-gray-500 dark:text-gray-400">
            メール認証
          </dt>
          <dd>
            <UBadge
              :color="isEmailVerified ? 'success' : 'warning'"
              variant="subtle"
              size="xs"
            >
              {{ isEmailVerified ? '認証済み' : '未認証' }}
            </UBadge>
          </dd>
        </div>
        <div class="flex items-center justify-between">
          <dt class="text-sm text-gray-500 dark:text-gray-400">
            2段階認証
          </dt>
          <dd class="text-sm text-gray-400">
            未設定
          </dd>
        </div>
      </dl>
    </UCard>
  </div>
</template>
