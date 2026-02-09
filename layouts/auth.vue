<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="w-full max-w-md p-8">
      <div class="text-center mb-8">
        <NuxtLink to="/" class="text-2xl font-bold">Haishin+ HUB</NuxtLink>
      </div>
      <UCard>
        <slot />
      </UCard>
    </div>
  </div>
</template>
