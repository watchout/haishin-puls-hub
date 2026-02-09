// テナント Pinia ストア
// AUTH-001 仕様書に基づくテナント・ロール状態管理

import { defineStore } from 'pinia';
import type { LoginContextTenant, Role, TenantState } from '~/types/auth';
import { ROLE_REDIRECT_MAP } from '~/types/auth';

export const useTenantStore = defineStore('tenant', () => {
  // ──────────────────────────────────────
  // State
  // ──────────────────────────────────────

  const currentTenant = ref<LoginContextTenant | null>(null);
  const currentRole = ref<Role | null>(null);

  // ──────────────────────────────────────
  // Getters
  // ──────────────────────────────────────

  const hasTenant = computed(() => currentTenant.value !== null);

  const tenantId = computed(() => currentTenant.value?.id ?? null);

  const tenantName = computed(() => currentTenant.value?.name ?? '');

  const tenantSlug = computed(() => currentTenant.value?.slug ?? '');

  /** 現在のロールに基づくリダイレクト先 */
  const redirectPath = computed(() => {
    if (!currentRole.value) return '/app';
    return ROLE_REDIRECT_MAP[currentRole.value] ?? '/app';
  });

  // ──────────────────────────────────────
  // Actions
  // ──────────────────────────────────────

  /** テナント情報をセット */
  function setTenantContext(tenant: LoginContextTenant, role: Role) {
    currentTenant.value = tenant;
    currentRole.value = role;
  }

  /** ストアをリセット（ログアウト時） */
  function reset() {
    currentTenant.value = null;
    currentRole.value = null;
  }

  return {
    // State
    currentTenant,
    currentRole,
    // Getters
    hasTenant,
    tenantId,
    tenantName,
    tenantSlug,
    redirectPath,
    // Actions
    setTenantContext,
    reset,
  };
});
