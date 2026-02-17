<!-- SEC-003 レート制限エラー表示コンポーネント -->
<!-- 仕様書: docs/design/features/common/SEC-001-007_security.md §6.2 -->

<template>
  <UAlert
    v-if="show"
    icon="i-lucide-shield-alert"
    color="warning"
    variant="soft"
    title="リクエスト制限に達しました"
    :description="`${remainingSeconds}秒後に再試行してください`"
    :close="{
      color: 'warning',
      variant: 'link',
    }"
    @update:open="show = false"
  />
</template>

<script setup lang="ts">
interface Props {
  retryAfter?: number;
}

const props = withDefaults(defineProps<Props>(), {
  retryAfter: 60,
});

const show = ref(true);
const remainingSeconds = ref(props.retryAfter);

// カウントダウンタイマー
let intervalId: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  intervalId = setInterval(() => {
    remainingSeconds.value -= 1;
    if (remainingSeconds.value <= 0) {
      show.value = false;
      if (intervalId) clearInterval(intervalId);
    }
  }, 1000);
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>
