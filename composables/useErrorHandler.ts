// ERR-001-003 エラーハンドリング Composable
// 仕様書: docs/design/features/common/ERR-001-003_error-pages.md §11.5

/**
 * エラーハンドリング Composable
 *
 * 使用例:
 * ```ts
 * const { handleError } = useErrorHandler()
 *
 * try {
 *   await $fetch('/api/v1/events')
 * } catch (err) {
 *   handleError(err)
 * }
 * ```
 */
export function useErrorHandler() {
  const config = useRuntimeConfig()

  /**
   * エラーの種類に応じて適切な createError を throw する。
   * error.vue が受け取り、statusCode に応じたコンポーネントを表示する。
   */
  const handleError = (error: unknown): never => {
    // Nuxt Error（statusCode を持つオブジェクト）
    if (
      error !== null &&
      typeof error === 'object' &&
      'statusCode' in error
    ) {
      const nuxtError = error as { statusCode: number; message?: string; data?: unknown }

      switch (nuxtError.statusCode) {
        case 401:
        case 403:
        case 404:
          // そのまま re-throw（error.vue で処理）
          throw createError({
            statusCode: nuxtError.statusCode,
            message: nuxtError.message || '',
            data: nuxtError.data,
          })
        default:
          // 500系・その他は共通のサーバーエラーとして処理
          throw createError({
            statusCode: nuxtError.statusCode >= 500 ? nuxtError.statusCode : 500,
            message: 'サーバーエラーが発生しました',
            data: {
              requestId:
                (nuxtError.data as Record<string, string> | undefined)?.requestId
                || crypto.randomUUID(),
              supportEmail: config.public.supportEmail || 'support@example.com',
              retryable: true,
            },
          })
      }
    }

    // クライアント側の予期しないエラー → 500 として処理
    throw createError({
      statusCode: 500,
      message: '予期しないエラーが発生しました',
      data: {
        requestId: crypto.randomUUID(),
        supportEmail: config.public.supportEmail || 'support@example.com',
        retryable: true,
      },
    })
  }

  return {
    handleError,
  }
}
