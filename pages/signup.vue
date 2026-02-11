<script setup lang="ts">
// ACCT-001 サインアップページ
// 招待トークンがある場合は招待情報を取得して表示
// auth レイアウト使用、SignupForm コンポーネント配置

import type { InvitationInfoResponse } from '~/types/auth';

definePageMeta({
  layout: 'auth',
});

const route = useRoute();
const token = computed(() => route.query.token as string | undefined);

// 招待情報
const invitationData = ref<InvitationInfoResponse['data'] | null>(null);
const invitationError = ref<{ code: string; message: string } | null>(null);
const isLoadingInvitation = ref(false);

// 招待トークンがある場合は招待情報を取得
onMounted(async () => {
  if (!token.value) return;

  isLoadingInvitation.value = true;
  try {
    const response = await $fetch<InvitationInfoResponse>(
      `/api/v1/invitations/${token.value}`,
    );
    invitationData.value = response.data;
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'data' in err) {
      const httpErr = err as { data?: { error?: { code: string; message: string } } };
      invitationError.value = httpErr.data?.error ?? {
        code: 'UNKNOWN',
        message: '招待情報の取得に失敗しました',
      };
    } else {
      invitationError.value = {
        code: 'NETWORK_ERROR',
        message: '通信エラーが発生しました。再試行してください',
      };
    }
  } finally {
    isLoadingInvitation.value = false;
  }
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-center mb-8">
      新規登録
    </h1>

    <!-- 招待情報読み込み中 -->
    <div v-if="token && isLoadingInvitation" class="flex justify-center py-8">
      <UButton loading variant="ghost" size="lg" disabled>
        招待情報を確認中...
      </UButton>
    </div>

    <!-- 招待エラー（トークン無効/期限切れ/使用済み） -->
    <div v-else-if="invitationError" class="space-y-4">
      <UAlert
        :description="invitationError.message"
        color="error"
        icon="i-lucide-alert-circle"
        variant="soft"
      />

      <!-- 使用済みの場合はログインリンク -->
      <div
        v-if="invitationError.code === 'INVITATION_ALREADY_USED'"
        class="text-center"
      >
        <NuxtLink
          to="/login"
          class="text-primary font-medium hover:underline"
        >
          ログインはこちら
        </NuxtLink>
      </div>

      <!-- 期限切れの場合は再招待ガイダンス -->
      <p
        v-if="invitationError.code === 'INVITATION_EXPIRED'"
        class="text-center text-sm text-gray-500"
      >
        管理者に再招待をご依頼ください
      </p>
    </div>

    <!-- サインアップフォーム -->
    <SignupForm
      v-else-if="!token || invitationData"
      :invitation="invitationData"
    />
  </div>
</template>
