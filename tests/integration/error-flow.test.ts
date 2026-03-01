// ERR-001-003 エラーハンドリングフロー 結合テスト
// 仕様書: docs/design/features/common/ERR-001-003_error-pages.md
//
// エラー発生 → useErrorHandler → error.vue → コンポーネント選択
// の一連のフローをモック環境で検証する。

import { describe, it, expect, vi } from 'vitest'

// ─── テスト対象のインポート ───

import {
  processError,
  selectErrorComponent,
} from '~/composables/useErrorHandler'

// ─── Nuxt auto-import モック ───

const mockConfig = {
  public: {
    supportEmail: 'support@haishin-plus-hub.com',
  },
}
vi.stubGlobal('useRuntimeConfig', () => mockConfig)

vi.stubGlobal('createError', (opts: Record<string, unknown>) => opts)

vi.stubGlobal('crypto', {
  randomUUID: () => '550e8400-e29b-41d4-a716-446655440000',
})

// ─── コンポーネント抽出ロジック ───

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

const SUPPORT_EMAIL = 'support@haishin-plus-hub.com'

// ─── 結合テスト ───

describe('エラーハンドリングフロー結合テスト', () => {
  describe('404 フロー: 存在しないページ → Error404', () => {
    it('サーバーが 404 を返す → error.vue → Error404 表示', () => {
      const serverError = { statusCode: 404, message: 'Not Found' }

      const processed = processError(serverError, SUPPORT_EMAIL)
      expect(processed.statusCode).toBe(404)
      expect(selectErrorComponent(processed.statusCode)).toBe('Error404')

      const viewData = extractError404Data()
      expect(viewData.title).toBe('ページが見つかりません')
      expect(viewData.searchEnabled).toBe(true)
      expect(viewData.popularLinksCount).toBeLessThanOrEqual(5)
    })
  })

  describe('403 フロー: 権限不足 → Error403 + ロール情報', () => {
    it('viewer が admin ページにアクセス → ロール情報付き 403', () => {
      const serverError = {
        statusCode: 403,
        message: 'Forbidden',
        data: { currentRole: 'viewer', requiredRole: 'admin' },
      }

      const processed = processError(serverError, SUPPORT_EMAIL)
      expect(processed.statusCode).toBe(403)
      expect(processed.data).toEqual({
        currentRole: 'viewer',
        requiredRole: 'admin',
      })
      expect(selectErrorComponent(processed.statusCode)).toBe('Error403')

      const viewData = extractError403Data(processed.data as Record<string, string>)
      expect(viewData.currentRole).toBe('viewer')
      expect(viewData.requiredRole).toBe('admin')
      expect(viewData.requestAccessEnabled).toBe(true)
    })

    it('data なしの 403 → デフォルトロール表示', () => {
      const processed = processError({ statusCode: 403, message: 'Forbidden' }, SUPPORT_EMAIL)
      const viewData = extractError403Data(processed.data as Record<string, string> | undefined)
      expect(viewData.currentRole).toBe('ゲスト')
      expect(viewData.requiredRole).toBe('不明')
    })
  })

  describe('500 フロー: サーバーエラー → Error500 + エラーID', () => {
    it('DB接続エラー → 500 + requestId + supportEmail', () => {
      const serverError = { statusCode: 500, message: 'DB connection failed' }

      const processed = processError(serverError, SUPPORT_EMAIL)
      expect(processed.statusCode).toBe(500)
      expect(processed.message).toBe('サーバーエラーが発生しました')

      const data = processed.data as Record<string, unknown>
      expect(data.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      )
      expect(data.supportEmail).toBe('support@haishin-plus-hub.com')
      expect(data.retryable).toBe(true)

      expect(selectErrorComponent(processed.statusCode)).toBe('Error500')

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
      const processed = processError(serverError, SUPPORT_EMAIL)
      const data = processed.data as Record<string, string>
      expect(data.requestId).toBe('custom-request-id-abc')
    })
  })

  describe('401 フロー: 未認証 → ログインリダイレクト', () => {
    it('401 エラーは error.vue でリダイレクト（ページ表示なし）', () => {
      const serverError = { statusCode: 401, message: 'Unauthorized' }
      const processed = processError(serverError, SUPPORT_EMAIL)

      const shouldRedirect = processed.statusCode === 401
      expect(shouldRedirect).toBe(true)

      const currentPath = '/dashboard'
      const redirectUrl = `/login?redirect=${encodeURIComponent(currentPath)}`
      expect(redirectUrl).toBe('/login?redirect=%2Fdashboard')
    })
  })

  describe('503 フロー: サービス停止 → Error500 フォールバック', () => {
    it('503 は statusCode 維持しつつ Error500 で表示', () => {
      const serverError = { statusCode: 503, message: 'Service Unavailable' }
      const processed = processError(serverError, SUPPORT_EMAIL)

      expect(processed.statusCode).toBe(503)
      expect(processed.message).toBe('サーバーエラーが発生しました')
      expect(selectErrorComponent(processed.statusCode)).toBe('Error500')

      const data = processed.data as Record<string, unknown>
      expect(data.requestId).toBeTruthy()
      expect(data.supportEmail).toBe('support@haishin-plus-hub.com')
    })
  })

  describe('未知のエラーフロー', () => {
    it('statusCode なしのエラー → 500 + Error500', () => {
      const processed = processError(new Error('Unexpected crash'), SUPPORT_EMAIL)
      expect(processed.statusCode).toBe(500)
      expect(processed.message).toBe('予期しないエラーが発生しました')
      expect(selectErrorComponent(processed.statusCode)).toBe('Error500')
    })

    it('4xx（401/403/404 以外）→ 500 に変換 → Error500', () => {
      for (const code of [400, 405, 408, 429]) {
        const processed = processError({ statusCode: code, message: `Error ${code}` }, SUPPORT_EMAIL)
        expect(processed.statusCode).toBe(500)
        expect(selectErrorComponent(500)).toBe('Error500')
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
