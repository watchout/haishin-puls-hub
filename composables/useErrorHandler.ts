// ERR-001-003 エラーハンドリング Composable
// 仕様書: docs/design/features/common/ERR-001-003_error-pages.md §11.5

/** createError に渡すエラー情報 */
export interface ProcessedError {
  statusCode: number
  message: string
  data?: unknown
}

/**
 * エラーを処理して createError に渡す形式に変換する（純粋関数）。
 * Nuxt コンテキスト外でもテスト可能。
 */
export function processError(
  error: unknown,
  supportEmail: string,
): ProcessedError {
  if (
    error !== null
    && typeof error === 'object'
    && 'statusCode' in error
  ) {
    const nuxtError = error as { statusCode: number; message?: string; data?: unknown }

    switch (nuxtError.statusCode) {
      case 401:
      case 403:
      case 404:
        return {
          statusCode: nuxtError.statusCode,
          message: nuxtError.message || '',
          data: nuxtError.data,
        }
      default:
        return {
          statusCode: nuxtError.statusCode >= 500 ? nuxtError.statusCode : 500,
          message: 'サーバーエラーが発生しました',
          data: {
            requestId:
              (nuxtError.data as Record<string, string> | undefined)?.requestId
              || crypto.randomUUID(),
            supportEmail: supportEmail || 'support@example.com',
            retryable: true,
          },
        }
    }
  }

  return {
    statusCode: 500,
    message: '予期しないエラーが発生しました',
    data: {
      requestId: crypto.randomUUID(),
      supportEmail: supportEmail || 'support@example.com',
      retryable: true,
    },
  }
}

/**
 * error.vue のコンポーネント選択ロジック（純粋関数）。
 */
export function selectErrorComponent(statusCode: number): 'Error404' | 'Error403' | 'Error500' {
  switch (statusCode) {
    case 404:
      return 'Error404'
    case 403:
      return 'Error403'
    default:
      return 'Error500'
  }
}

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
    const processed = processError(error, config.public.supportEmail as string)
    throw createError(processed)
  }

  return {
    handleError,
  }
}
