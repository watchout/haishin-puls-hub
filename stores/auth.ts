// 認証 Pinia ストア
// AUTH-001 仕様書に基づくユーザー・セッション状態管理

import { defineStore } from 'pinia';
import type { AuthUser } from '~/types/auth';

export const useAuthStore = defineStore('auth', () => {
  // ──────────────────────────────────────
  // State
  // ──────────────────────────────────────

  const user = ref<AuthUser | null>(null);
  const isLoading = ref(true);

  // ──────────────────────────────────────
  // Getters
  // ──────────────────────────────────────

  const isAuthenticated = computed(() => user.value !== null);

  // ──────────────────────────────────────
  // Actions
  // ──────────────────────────────────────

  /** ユーザー情報をセット */
  function setUser(userData: AuthUser | null) {
    user.value = userData;
  }

  /** ローディング状態をセット */
  function setLoading(loading: boolean) {
    isLoading.value = loading;
  }

  /** ストアをリセット（ログアウト時） */
  function reset() {
    user.value = null;
    isLoading.value = false;
  }

  return {
    // State
    user,
    isLoading,
    // Getters
    isAuthenticated,
    // Actions
    setUser,
    setLoading,
    reset,
  };
});
