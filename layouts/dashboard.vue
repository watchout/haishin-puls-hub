<template>
  <div class="min-h-screen flex">
    <!-- サイドバー（将来実装） -->
    <aside class="w-64 border-r border-gray-200 dark:border-gray-800 p-4">
      <div class="text-lg font-bold mb-8">Haishin+ HUB</div>
      <nav>
        <!-- NAV-001 仕様書に基づいて実装予定 -->
      </nav>
    </aside>

    <!-- メインコンテンツ -->
    <main class="flex-1 p-8">
      <slot />
    </main>
  </div>
</template>
