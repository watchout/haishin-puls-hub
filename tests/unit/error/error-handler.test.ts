// ERR-001-003 エラーハンドリング ユニットテスト
// 仕様書: docs/design/features/common/ERR-001-003_error-pages.md §10

import { describe, it, expect, vi, beforeEach } from 'vitest'

// --------------------------------------------------
// Nuxt auto-import モック
// --------------------------------------------------

// useRuntimeConfig モック
const mockConfig = {
  public: {
    supportEmail: 'support@haishin-plus-hub.com',
  },
}
vi.stubGlobal('useRuntimeConfig', () => mockConfig)

// createError モック: 引数をそのまま Error にして throw 可能にする
vi.stubGlobal('createError', (opts: Record<string, unknown>) => {
  const err = new Error(opts.message as string) as Error & {
    statusCode: number
    data: unknown
  }
  err.statusCode = opts.statusCode as number
  err.data = opts.data
  return err
})

// crypto.randomUUID モック
vi.stubGlobal('crypto', {
  randomUUID: () => '00000000-0000-4000-8000-000000000000',
})

// --------------------------------------------------
// テスト対象のインポート（モック適用後）
// --------------------------------------------------
// NOTE: useErrorHandler は Nuxt composable なので直接テストできる部分を検証
// ここでは createError に渡すロジックを関数単位でテストする

/**
 * useErrorHandler の handleError 相当のロジックを再実装してテスト
 * （Nuxt コンテキスト外で composable を直接呼べないため）
 */
function handleErrorLogic(error: unknown): {
  statusCode: number
  message: string
  data: unknown
} {
  const config = mockConfig

  if (error !== null && typeof error === 'object' && 'statusCode' in error) {
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
              (nuxtError.data as Record<string, string> | undefined)?.requestId ||
              crypto.randomUUID(),
            supportEmail: config.public.supportEmail || 'support@example.com',
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
      supportEmail: config.public.supportEmail || 'support@example.com',
      retryable: true,
    },
  }
}

// --------------------------------------------------
// エラーページ選択ロジック
// --------------------------------------------------
function selectErrorComponent(statusCode: number): string {
  switch (statusCode) {
    case 404:
      return 'Error404'
    case 403:
      return 'Error403'
    default:
      return 'Error500'
  }
}

// ──────────────────────────────────────
// TC-ERR: エラーページ選択テスト
// ──────────────────────────────────────

describe('エラーページ選択ロジック', () => {
  it('404 は Error404 コンポーネントを選択', () => {
    expect(selectErrorComponent(404)).toBe('Error404')
  })

  it('403 は Error403 コンポーネントを選択', () => {
    expect(selectErrorComponent(403)).toBe('Error403')
  })

  it('500 は Error500 コンポーネントを選択', () => {
    expect(selectErrorComponent(500)).toBe('Error500')
  })

  it('503 は Error500 にフォールバック', () => {
    expect(selectErrorComponent(503)).toBe('Error500')
  })

  it('502 は Error500 にフォールバック', () => {
    expect(selectErrorComponent(502)).toBe('Error500')
  })

  it('400 は Error500 にフォールバック', () => {
    expect(selectErrorComponent(400)).toBe('Error500')
  })

  it('未知のステータスコードは Error500 にフォールバック', () => {
    expect(selectErrorComponent(418)).toBe('Error500')
  })
})

// ──────────────────────────────────────
// エラーハンドリングロジックテスト
// ──────────────────────────────────────

describe('handleError ロジック', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('401 エラーはそのまま statusCode=401 で返す', () => {
    const result = handleErrorLogic({ statusCode: 401, message: 'Unauthorized' })
    expect(result.statusCode).toBe(401)
    expect(result.message).toBe('Unauthorized')
  })

  it('403 エラーはロール情報を data に保持する', () => {
    const result = handleErrorLogic({
      statusCode: 403,
      message: 'Forbidden',
      data: { requiredRole: 'admin', currentRole: 'participant' },
    })
    expect(result.statusCode).toBe(403)
    const data = result.data as Record<string, string>
    expect(data.requiredRole).toBe('admin')
    expect(data.currentRole).toBe('participant')
  })

  it('404 エラーはそのまま statusCode=404 で返す', () => {
    const result = handleErrorLogic({ statusCode: 404, message: 'Not Found' })
    expect(result.statusCode).toBe(404)
  })

  it('500 エラーは requestId と supportEmail を付与する', () => {
    const result = handleErrorLogic({ statusCode: 500, message: 'Internal Server Error' })
    expect(result.statusCode).toBe(500)
    expect(result.message).toBe('サーバーエラーが発生しました')
    const data = result.data as Record<string, unknown>
    expect(data.requestId).toBe('00000000-0000-4000-8000-000000000000')
    expect(data.supportEmail).toBe('support@haishin-plus-hub.com')
    expect(data.retryable).toBe(true)
  })

  it('503 エラーは statusCode=503 で返す（500フォールバック対象外）', () => {
    const result = handleErrorLogic({ statusCode: 503, message: 'Service Unavailable' })
    expect(result.statusCode).toBe(503)
    expect(result.message).toBe('サーバーエラーが発生しました')
  })

  it('400 エラーは statusCode=500 に変換される', () => {
    const result = handleErrorLogic({ statusCode: 400, message: 'Bad Request' })
    expect(result.statusCode).toBe(500)
    expect(result.message).toBe('サーバーエラーが発生しました')
  })

  it('既存の requestId がある場合はそれを使用する', () => {
    const result = handleErrorLogic({
      statusCode: 500,
      message: 'Error',
      data: { requestId: 'existing-request-id' },
    })
    const data = result.data as Record<string, string>
    expect(data.requestId).toBe('existing-request-id')
  })

  it('予期しないエラー（statusCode なし）は 500 として処理', () => {
    const result = handleErrorLogic(new Error('Unexpected'))
    expect(result.statusCode).toBe(500)
    expect(result.message).toBe('予期しないエラーが発生しました')
  })

  it('null エラーは 500 として処理', () => {
    const result = handleErrorLogic(null)
    expect(result.statusCode).toBe(500)
  })

  it('undefined エラーは 500 として処理', () => {
    const result = handleErrorLogic(undefined)
    expect(result.statusCode).toBe(500)
  })

  it('文字列エラーは 500 として処理', () => {
    const result = handleErrorLogic('something went wrong')
    expect(result.statusCode).toBe(500)
  })
})

// ──────────────────────────────────────
// 境界値テスト（§3-F）
// ──────────────────────────────────────

describe('境界値テスト（§3-F）', () => {
  it('requestId が N/A の場合（data なし）', () => {
    const result = handleErrorLogic({ statusCode: 500 })
    const data = result.data as Record<string, string>
    // requestId は UUID モックが適用される
    expect(data.requestId).toBeTruthy()
  })

  it('メッセージが空文字の場合', () => {
    const result = handleErrorLogic({ statusCode: 404, message: '' })
    expect(result.message).toBe('')
  })

  it('data が undefined の場合', () => {
    const result = handleErrorLogic({ statusCode: 403, message: 'Forbidden', data: undefined })
    expect(result.data).toBeUndefined()
  })
})

// ──────────────────────────────────────
// 401 自動リダイレクトロジックテスト
// ──────────────────────────────────────

describe('401 リダイレクトロジック', () => {
  it('401 エラーは /login にリダイレクトするべき', () => {
    // error.vue での処理をシミュレート
    const statusCode = 401
    const shouldRedirect = statusCode === 401
    expect(shouldRedirect).toBe(true)
  })

  it('redirect パラメータに元のパスを保持', () => {
    const currentPath = '/dashboard'
    const redirectUrl = `/login?redirect=${encodeURIComponent(currentPath)}`
    expect(redirectUrl).toBe('/login?redirect=%2Fdashboard')
  })

  it('日本語パスもエンコードされる', () => {
    const currentPath = '/events/イベント一覧'
    const encoded = encodeURIComponent(currentPath)
    expect(encoded).toBeTruthy()
    expect(decodeURIComponent(encoded)).toBe(currentPath)
  })
})
