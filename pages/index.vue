<script setup lang="ts">
definePageMeta({
  layout: 'default',
});
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <div class="text-center">
      <h1 class="text-4xl font-bold">Haishin+ HUB</h1>
      <p class="mt-4 text-lg text-gray-500">
        セミナー・イベント運営OS
      </p>
      <div class="mt-8 flex gap-4 justify-center">
        <UButton to="/login" size="lg">
          ログイン
        </UButton>
        <UButton to="/signup" variant="outline" size="lg">
          新規登録
        </UButton>
      </div>
    </div>
  </div>
</template>
