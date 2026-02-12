<script setup lang="ts">
// ROLE-003 PermissionGate コンポーネント
// 仕様書: docs/design/features/common/ROLE-001-004_rbac.md §6.3
//
// 使用例:
// <PermissionGate action="update" resource="venue">
//   <VenueEditForm />
// </PermissionGate>
//
// fallback モード（権限なしでも無効化表示）:
// <PermissionGate action="delete" resource="event" :fallback="true">
//   <UButton disabled>削除（権限なし）</UButton>
// </PermissionGate>

import type { Action, Resource } from '~/server/utils/permission-matrix';

interface Props {
  /** 必要なアクション */
  action: Action;
  /** 対象リソース */
  resource: Resource;
  /** true の場合、権限なしでも無効化状態で表示 */
  fallback?: boolean;
}

const props = defineProps<Props>();
const { can } = usePermission();

const hasPermission = computed(() => can(props.action, props.resource));
</script>

<template>
  <div v-if="hasPermission">
    <slot />
  </div>
  <div v-else-if="fallback" class="opacity-50 pointer-events-none">
    <slot />
  </div>
</template>
