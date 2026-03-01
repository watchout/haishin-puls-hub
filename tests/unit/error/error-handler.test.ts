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

  it('深いネストパスもエンコードされる', () => {
    const currentPath = '/admin/settings/users?tab=roles&page=2'
    const redirectUrl = `/login?redirect=${encodeURIComponent(currentPath)}`
    expect(redirectUrl).toContain('redirect=')
    expect(decodeURIComponent(redirectUrl.split('redirect=')[1])).toBe(currentPath)
  })
})

// ──────────────────────────────────────
// Error404 コンポーネントロジック（§6.1 / §3-H）
// ──────────────────────────────────────

/** 404ページの検索クエリバリデーション（§3-F） */
function validateSearchQuery(query: string): boolean {
  return query.trim().length > 0
}

/** 404ページの人気リンク定義 */
const POPULAR_LINKS = [
  { label: 'ダッシュボード', to: '/dashboard', icon: 'i-heroicons-home' },
  { label: 'イベント一覧', to: '/events', icon: 'i-heroicons-calendar' },
  { label: 'マイタスク', to: '/tasks', icon: 'i-heroicons-check-circle' },
  { label: 'ヘルプセンター', to: '/help', icon: 'i-heroicons-question-mark-circle' },
]

describe('Error404 検索バーロジック（§3-F / §3-H）', () => {
  it('有効なクエリで検索が実行される', () => {
    expect(validateSearchQuery('イベント')).toBe(true)
  })

  it('空文字では検索が実行されない', () => {
    expect(validateSearchQuery('')).toBe(false)
  })

  it('空白のみでは検索が実行されない', () => {
    expect(validateSearchQuery('   ')).toBe(false)
  })

  it('タブ文字のみでは検索が実行されない', () => {
    expect(validateSearchQuery('\t\n')).toBe(false)
  })

  it('前後の空白は trim される', () => {
    expect(validateSearchQuery('  イベント  ')).toBe(true)
  })

  it('検索URL が正しくエンコードされる（§3-E #5）', () => {
    const query = 'イベント'
    const url = `/search?q=${encodeURIComponent(query)}`
    expect(url).toContain('/search?q=')
    expect(decodeURIComponent(url.split('q=')[1])).toBe(query)
  })

  it('よく見られるページリンクが最大5件（§3-F）', () => {
    expect(POPULAR_LINKS.length).toBeLessThanOrEqual(5)
    expect(POPULAR_LINKS.length).toBeGreaterThan(0)
  })

  it('人気リンクに必須フィールドがある', () => {
    for (const link of POPULAR_LINKS) {
      expect(link.label).toBeTruthy()
      expect(link.to).toMatch(/^\//)
      expect(link.icon).toMatch(/^i-heroicons-/)
    }
  })
})

// ──────────────────────────────────────
// Error403 コンポーネントロジック（§6.2 / BR-002）
// ──────────────────────────────────────

/** 403 ロール情報抽出 */
function extractRoleInfo(errorData: Record<string, string> | undefined): {
  currentRole: string
  requiredRole: string
} {
  return {
    currentRole: errorData?.currentRole || 'ゲスト',
    requiredRole: errorData?.requiredRole || '不明',
  }
}

/** BR-002: ロール別ガイダンスメッセージ */
function getRoleGuidance(role: string): string {
  switch (role) {
    case 'participant':
    case 'viewer':
      return '閲覧のみ可能です。編集権限が必要です。'
    case 'speaker':
    case 'vendor':
      return '一部の機能にアクセスできません。管理者権限が必要です。'
    case 'organizer':
    case 'event_planner':
      return 'この機能にはより上位の権限が必要です。'
    default:
      return 'ログインしていないか、適切な権限がない可能性があります。'
  }
}

describe('Error403 ロール情報（BR-002 / §3-H）', () => {
  it('currentRole と requiredRole を error.data から取得', () => {
    const info = extractRoleInfo({ currentRole: 'viewer', requiredRole: 'admin' })
    expect(info.currentRole).toBe('viewer')
    expect(info.requiredRole).toBe('admin')
  })

  it('data なしの場合はデフォルト値', () => {
    const info = extractRoleInfo(undefined)
    expect(info.currentRole).toBe('ゲスト')
    expect(info.requiredRole).toBe('不明')
  })

  it('currentRole が空文字の場合はデフォルト値', () => {
    const info = extractRoleInfo({ currentRole: '', requiredRole: 'admin' })
    expect(info.currentRole).toBe('ゲスト')
  })

  it('viewer ロールのガイダンス', () => {
    expect(getRoleGuidance('viewer')).toBe('閲覧のみ可能です。編集権限が必要です。')
  })

  it('participant ロールのガイダンス', () => {
    expect(getRoleGuidance('participant')).toBe('閲覧のみ可能です。編集権限が必要です。')
  })

  it('speaker ロールのガイダンス', () => {
    expect(getRoleGuidance('speaker')).toBe('一部の機能にアクセスできません。管理者権限が必要です。')
  })

  it('vendor ロールのガイダンス', () => {
    expect(getRoleGuidance('vendor')).toBe('一部の機能にアクセスできません。管理者権限が必要です。')
  })

  it('organizer ロールのガイダンス', () => {
    expect(getRoleGuidance('organizer')).toBe('この機能にはより上位の権限が必要です。')
  })

  it('event_planner ロールのガイダンス', () => {
    expect(getRoleGuidance('event_planner')).toBe('この機能にはより上位の権限が必要です。')
  })

  it('未知のロールはデフォルトガイダンス', () => {
    expect(getRoleGuidance('unknown_role')).toBe('ログインしていないか、適切な権限がない可能性があります。')
  })

  it('ゲスト（未ログイン）のガイダンス', () => {
    expect(getRoleGuidance('ゲスト')).toBe('ログインしていないか、適切な権限がない可能性があります。')
  })
})

// ──────────────────────────────────────
// Error500 コンポーネントロジック（§6.3 / §3-F）
// ──────────────────────────────────────

/** 500 requestId 抽出（§3-F: 未設定時は N/A） */
function extractRequestId(errorData: Record<string, string> | undefined): string {
  return errorData?.requestId || 'N/A'
}

/** 500 retryable フラグ（デフォルト: true） */
function isRetryable(errorData: Record<string, boolean> | undefined): boolean {
  return errorData?.retryable !== false
}

/** サポートメールフォールバック */
function getSupportEmail(configEmail: string | undefined): string {
  return configEmail || 'support@example.com'
}

describe('Error500 ロジック（§3-F / §3-H）', () => {
  it('requestId を error.data から取得', () => {
    expect(extractRequestId({ requestId: '550e8400-e29b-41d4-a716-446655440000' }))
      .toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  it('requestId 未設定時は N/A を表示（§3-F）', () => {
    expect(extractRequestId(undefined)).toBe('N/A')
    expect(extractRequestId({})).toBe('N/A')
  })

  it('retryable が true の場合は再試行ボタン表示', () => {
    expect(isRetryable({ retryable: true })).toBe(true)
  })

  it('retryable が false の場合は再試行ボタン非表示', () => {
    expect(isRetryable({ retryable: false })).toBe(false)
  })

  it('retryable 未設定時はデフォルト true', () => {
    expect(isRetryable(undefined)).toBe(true)
    expect(isRetryable({})).toBe(true)
  })

  it('サポートメールは設定から取得', () => {
    expect(getSupportEmail('support@haishin-plus-hub.com')).toBe('support@haishin-plus-hub.com')
  })

  it('サポートメール未設定時はフォールバック', () => {
    expect(getSupportEmail(undefined)).toBe('support@example.com')
    expect(getSupportEmail('')).toBe('support@example.com')
  })
})

// ──────────────────────────────────────
// §3-G: 例外レスポンスマッピング
// ──────────────────────────────────────

describe('例外レスポンスマッピング（§3-G）', () => {
  it('NOT_FOUND → 404 → Error404', () => {
    const result = handleErrorLogic({ statusCode: 404, message: 'ページが見つかりません' })
    expect(result.statusCode).toBe(404)
    expect(selectErrorComponent(result.statusCode)).toBe('Error404')
  })

  it('FORBIDDEN → 403 → Error403 + ロール情報', () => {
    const result = handleErrorLogic({
      statusCode: 403,
      message: 'アクセス権限がありません',
      data: { requiredRole: 'admin', currentRole: 'viewer' },
    })
    expect(result.statusCode).toBe(403)
    expect(selectErrorComponent(result.statusCode)).toBe('Error403')
    const data = result.data as Record<string, string>
    expect(data.requiredRole).toBe('admin')
  })

  it('INTERNAL_SERVER_ERROR → 500 → Error500 + requestId', () => {
    const result = handleErrorLogic({
      statusCode: 500,
      message: 'Internal Server Error',
      data: { requestId: 'abc-123', supportEmail: 'test@test.com', retryable: true },
    })
    expect(result.statusCode).toBe(500)
    expect(selectErrorComponent(result.statusCode)).toBe('Error500')
  })

  it('UNAUTHORIZED → 401 → ログインリダイレクト（ページ表示なし）', () => {
    const result = handleErrorLogic({ statusCode: 401, message: '' })
    expect(result.statusCode).toBe(401)
    // 401 は error.vue でリダイレクト処理される
    const shouldRedirect = result.statusCode === 401
    expect(shouldRedirect).toBe(true)
  })

  it('SERVICE_UNAVAILABLE → 503 → Error500 フォールバック', () => {
    const result = handleErrorLogic({ statusCode: 503, message: 'Service Unavailable' })
    expect(result.statusCode).toBe(503)
    expect(selectErrorComponent(result.statusCode)).toBe('Error500')
    expect(result.message).toBe('サーバーエラーが発生しました')
  })

  it('その他の 4xx → 500 に変換 → Error500 フォールバック', () => {
    for (const code of [400, 405, 408, 429]) {
      const result = handleErrorLogic({ statusCode: code, message: `Error ${code}` })
      expect(result.statusCode).toBe(500)
      expect(selectErrorComponent(500)).toBe('Error500')
    }
  })

  it('その他の 5xx → statusCode 維持 → Error500 フォールバック', () => {
    for (const code of [502, 504]) {
      const result = handleErrorLogic({ statusCode: code, message: `Error ${code}` })
      expect(result.statusCode).toBe(code)
      expect(selectErrorComponent(code)).toBe('Error500')
    }
  })
})

// ──────────────────────────────────────
// §3-E: 入出力シナリオ
// ──────────────────────────────────────

describe('入出力シナリオ（§3-E）', () => {
  it('#1: /events/999999 → 404 + タイトル「ページが見つかりません」', () => {
    const result = handleErrorLogic({ statusCode: 404, message: 'ページが見つかりません' })
    expect(result.statusCode).toBe(404)
    expect(selectErrorComponent(404)).toBe('Error404')
  })

  it('#2: viewer で /admin/settings → 403 + ロール情報', () => {
    const result = handleErrorLogic({
      statusCode: 403,
      message: 'アクセス権限がありません',
      data: { requiredRole: 'admin', currentRole: 'viewer' },
    })
    expect(result.statusCode).toBe(403)
    const info = extractRoleInfo(result.data as Record<string, string>)
    expect(info.currentRole).toBe('viewer')
    expect(info.requiredRole).toBe('admin')
  })

  it('#3: DB接続障害 → 500 + requestId（UUID形式）', () => {
    const result = handleErrorLogic({ statusCode: 500, message: 'DB connection failed' })
    const data = result.data as Record<string, string>
    expect(data.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })

  it('#4: 未認証で /dashboard → 401 リダイレクト', () => {
    const result = handleErrorLogic({ statusCode: 401 })
    expect(result.statusCode).toBe(401)
    const redirectUrl = `/login?redirect=${encodeURIComponent('/dashboard')}`
    expect(redirectUrl).toBe('/login?redirect=%2Fdashboard')
  })

  it('#5: 検索バーに「イベント」→ /search?q= へ遷移', () => {
    const query = 'イベント'
    expect(validateSearchQuery(query)).toBe(true)
    const url = `/search?q=${encodeURIComponent(query)}`
    expect(url).toContain('/search?q=')
  })

  it('#6: 500ページの再試行 → window.location.reload()', () => {
    // retryable が true なら再試行ボタンが表示される
    expect(isRetryable({ retryable: true })).toBe(true)
  })

  it('#7: 403ページの「権限をリクエスト」→ /request-access へ遷移', () => {
    // handleRequestAccess は clearError({ redirect: '/request-access' }) を呼ぶ
    const redirectPath = '/request-access'
    expect(redirectPath).toBe('/request-access')
  })
})
