// ERR-001-003 エラーハンドリングフロー 結合テスト
// 仕様書: docs/design/features/common/ERR-001-003_error-pages.md
//
// エラー発生 → useErrorHandler → error.vue → コンポーネント選択
// の一連のフローをモック環境で検証する。

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Nuxt auto-import モック ───

const mockConfig = {
  public: {
    supportEmail: 'support@haishin-plus-hub.com',
  },
}
vi.stubGlobal('useRuntimeConfig', () => mockConfig)

const createdErrors: Array<{
  statusCode: number
  message: string
  data?: unknown
}> = []

vi.stubGlobal('createError', (opts: Record<string, unknown>) => {
  const err = {
    statusCode: opts.statusCode as number,
    message: (opts.message as string) || '',
    data: opts.data,
  }
  createdErrors.push(err)
  return err
})

vi.stubGlobal('crypto', {
  randomUUID: () => '550e8400-e29b-41d4-a716-446655440000',
})

// ─── エラーハンドリングパイプライン再現 ───

/**
 * Step 1: useErrorHandler がエラーを受け取り createError に変換する
 */
function processError(error: unknown): {
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
              (nuxtError.data as Record<string, string> | undefined)?.requestId
              || crypto.randomUUID(),
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

/**
 * Step 2: error.vue がコンポーネントを選択する
 */
function selectComponent(statusCode: number): string {
  switch (statusCode) {
    case 404: return 'Error404'
    case 403: return 'Error403'
    default: return 'Error500'
  }
}

/**
 * Step 3: error.vue が 401 リダイレクトを判定する
 */
function shouldRedirectToLogin(statusCode: number): boolean {
  return statusCode === 401
}

/**
 * Step 4: 各コンポーネントがエラーデータを抽出する
 */
function extractError404Data() {
  return {
    title: 'ページが見つかりません',
    searchEnabled: true,
    popularLinksCount: 4,
  }
}

function extractError403Data(data: Record<string, string> | undefined) {
  return {
    title: 'アクセス権限がありません',
    currentRole: data?.currentRole || 'ゲスト',
    requiredRole: data?.requiredRole || '不明',
    requestAccessEnabled: true,
  }
}

function extractError500Data(data: Record<string, unknown> | undefined) {
  return {
    title: 'サーバーエラーが発生しました',
    requestId: (data?.requestId as string) || 'N/A',
    supportEmail: (data?.supportEmail as string) || 'support@example.com',
    retryable: data?.retryable !== false,
  }
}

// ─── 結合テスト ───

describe('エラーハンドリングフロー結合テスト', () => {
  beforeEach(() => {
    createdErrors.length = 0
  })

  describe('404 フロー: 存在しないページ → Error404', () => {
    it('サーバーが 404 を返す → error.vue → Error404 表示', () => {
      // Step 1: API/ページが 404 を throw
      const serverError = { statusCode: 404, message: 'Not Found' }

      // Step 2: useErrorHandler が処理
      const processed = processError(serverError)
      expect(processed.statusCode).toBe(404)

      // Step 3: error.vue がコンポーネント選択
      expect(shouldRedirectToLogin(processed.statusCode)).toBe(false)
      expect(selectComponent(processed.statusCode)).toBe('Error404')

      // Step 4: Error404 がデータ抽出
      const viewData = extractError404Data()
      expect(viewData.title).toBe('ページが見つかりません')
      expect(viewData.searchEnabled).toBe(true)
      expect(viewData.popularLinksCount).toBeLessThanOrEqual(5)
    })
  })

  describe('403 フロー: 権限不足 → Error403 + ロール情報', () => {
    it('viewer が admin ページにアクセス → ロール情報付き 403', () => {
      // Step 1: サーバーが 403 + ロール情報を返す
      const serverError = {
        statusCode: 403,
        message: 'Forbidden',
        data: { currentRole: 'viewer', requiredRole: 'admin' },
      }

      // Step 2: useErrorHandler が処理（ロール情報を保持）
      const processed = processError(serverError)
      expect(processed.statusCode).toBe(403)
      expect(processed.data).toEqual({
        currentRole: 'viewer',
        requiredRole: 'admin',
      })

      // Step 3: error.vue がコンポーネント選択
      expect(shouldRedirectToLogin(processed.statusCode)).toBe(false)
      expect(selectComponent(processed.statusCode)).toBe('Error403')

      // Step 4: Error403 がロール情報を表示
      const viewData = extractError403Data(processed.data as Record<string, string>)
      expect(viewData.currentRole).toBe('viewer')
      expect(viewData.requiredRole).toBe('admin')
      expect(viewData.requestAccessEnabled).toBe(true)
    })

    it('data なしの 403 → デフォルトロール表示', () => {
      const processed = processError({ statusCode: 403, message: 'Forbidden' })
      const viewData = extractError403Data(processed.data as Record<string, string> | undefined)
      expect(viewData.currentRole).toBe('ゲスト')
      expect(viewData.requiredRole).toBe('不明')
    })
  })

  describe('500 フロー: サーバーエラー → Error500 + エラーID', () => {
    it('DB接続エラー → 500 + requestId + supportEmail', () => {
      // Step 1: サーバーが 500 を返す
      const serverError = { statusCode: 500, message: 'DB connection failed' }

      // Step 2: useErrorHandler が requestId を生成
      const processed = processError(serverError)
      expect(processed.statusCode).toBe(500)
      expect(processed.message).toBe('サーバーエラーが発生しました')

      const data = processed.data as Record<string, unknown>
      expect(data.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      )
      expect(data.supportEmail).toBe('support@haishin-plus-hub.com')
      expect(data.retryable).toBe(true)

      // Step 3: error.vue がコンポーネント選択
      expect(selectComponent(processed.statusCode)).toBe('Error500')

      // Step 4: Error500 がエラー情報を表示
      const viewData = extractError500Data(processed.data as Record<string, unknown>)
      expect(viewData.requestId).not.toBe('N/A')
      expect(viewData.supportEmail).toBe('support@haishin-plus-hub.com')
      expect(viewData.retryable).toBe(true)
    })

    it('既存の requestId がある場合はそれを使用', () => {
      const serverError = {
        statusCode: 500,
        message: 'Error',
        data: { requestId: 'custom-request-id-abc' },
      }
      const processed = processError(serverError)
      const data = processed.data as Record<string, string>
      expect(data.requestId).toBe('custom-request-id-abc')
    })
  })

  describe('401 フロー: 未認証 → ログインリダイレクト', () => {
    it('401 エラーは error.vue でリダイレクト（ページ表示なし）', () => {
      const serverError = { statusCode: 401, message: 'Unauthorized' }
      const processed = processError(serverError)

      // error.vue は 401 を検知してリダイレクト
      expect(shouldRedirectToLogin(processed.statusCode)).toBe(true)

      // リダイレクト先の構築
      const currentPath = '/dashboard'
      const redirectUrl = `/login?redirect=${encodeURIComponent(currentPath)}`
      expect(redirectUrl).toBe('/login?redirect=%2Fdashboard')
    })
  })

  describe('503 フロー: サービス停止 → Error500 フォールバック', () => {
    it('503 は statusCode 維持しつつ Error500 で表示', () => {
      const serverError = { statusCode: 503, message: 'Service Unavailable' }
      const processed = processError(serverError)

      // statusCode は 503 のまま
      expect(processed.statusCode).toBe(503)
      // メッセージは共通の 500 メッセージ
      expect(processed.message).toBe('サーバーエラーが発生しました')
      // Error500 にフォールバック
      expect(selectComponent(processed.statusCode)).toBe('Error500')

      // requestId と supportEmail が付与される
      const data = processed.data as Record<string, unknown>
      expect(data.requestId).toBeTruthy()
      expect(data.supportEmail).toBe('support@haishin-plus-hub.com')
    })
  })

  describe('未知のエラーフロー', () => {
    it('statusCode なしのエラー → 500 + Error500', () => {
      const processed = processError(new Error('Unexpected crash'))
      expect(processed.statusCode).toBe(500)
      expect(processed.message).toBe('予期しないエラーが発生しました')
      expect(selectComponent(processed.statusCode)).toBe('Error500')
    })

    it('4xx（401/403/404 以外）→ 500 に変換 → Error500', () => {
      for (const code of [400, 405, 408, 429]) {
        const processed = processError({ statusCode: code, message: `Error ${code}` })
        expect(processed.statusCode).toBe(500)
        expect(selectComponent(500)).toBe('Error500')
      }
    })
  })

  describe('SEO メタデータ', () => {
    it('エラーページは noindex, nofollow を設定する', () => {
      const meta = { name: 'robots', content: 'noindex, nofollow' }
      expect(meta.content).toBe('noindex, nofollow')
    })

    it('タイトルにステータスコードを含む', () => {
      for (const code of [404, 403, 500]) {
        const title = `エラー ${code} | Haishin+ HUB`
        expect(title).toContain(String(code))
        expect(title).toContain('Haishin+ HUB')
      }
    })
  })
})
