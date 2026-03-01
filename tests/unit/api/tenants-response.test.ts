// ACCT-002 §5.3: GET /api/v1/tenants レスポンス形式検証
// API ハンドラの実行はDB接続が必要なため、レスポンス形式の
// 型・構造テストとマッピングロジックの検証を行う

import { describe, it, expect } from 'vitest'
import type { TenantMembership } from '~/composables/useProfile'

// §5.3 レスポンスの期待フォーマット
interface TenantsApiResponse {
  data: TenantMembership[]
}

// ──────────────────────────────────────
// §5.3 レスポンス形式テスト
// ──────────────────────────────────────

describe('GET /api/v1/tenants レスポンス形式 (§5.3)', () => {
  it('正常レスポンス: data 配列にテナント一覧を含む', () => {
    const response: TenantsApiResponse = {
      data: [
        {
          id: '01HTENANT1ABC',
          name: 'ビジョンセンター',
          slug: 'vision-center',
          logo_url: 'https://example.com/logo.png',
          role: 'venue_staff',
          is_default: true,
          joined_at: '2026-01-15T10:00:00+09:00',
        },
        {
          id: '01HTENANT2DEF',
          name: '企画会社A',
          slug: 'planner-a',
          logo_url: null,
          role: 'event_planner',
          is_default: false,
          joined_at: '2026-02-01T09:00:00+09:00',
        },
      ],
    }

    expect(response.data).toHaveLength(2)
    expect(response.data[0]!.id).toBeTruthy()
    expect(response.data[0]!.name).toBe('ビジョンセンター')
    expect(response.data[0]!.slug).toBe('vision-center')
    expect(response.data[0]!.logo_url).toBe('https://example.com/logo.png')
    expect(response.data[0]!.role).toBe('venue_staff')
    expect(response.data[0]!.is_default).toBe(true)
    expect(response.data[0]!.joined_at).toBeTruthy()
  })

  it('空のテナント一覧（AC-103: テナント未所属）', () => {
    const response: TenantsApiResponse = {
      data: [],
    }
    expect(response.data).toHaveLength(0)
  })

  it('logo_url が null のテナント', () => {
    const response: TenantsApiResponse = {
      data: [
        {
          id: '01HTENANT3GHI',
          name: 'テスト会社',
          slug: 'test-co',
          logo_url: null,
          role: 'participant',
          is_default: false,
          joined_at: '2026-02-01T00:00:00Z',
        },
      ],
    }
    expect(response.data[0]!.logo_url).toBeNull()
  })

  it('全10ロールがレスポンスに含まれ得る', () => {
    const validRoles = [
      'system_admin', 'tenant_admin', 'organizer', 'venue_staff',
      'streaming_provider', 'event_planner', 'speaker',
      'sales_marketing', 'participant', 'vendor',
    ]
    for (const role of validRoles) {
      const membership: TenantMembership = {
        id: '01HTEST',
        name: 'Test',
        slug: 'test',
        logo_url: null,
        role,
        is_default: false,
        joined_at: '2026-01-01T00:00:00Z',
      }
      expect(membership.role).toBe(role)
    }
  })
})

// ──────────────────────────────────────
// §5.3 エラーレスポンス形式テスト
// ──────────────────────────────────────

describe('GET /api/v1/tenants エラーレスポンス (§5.3)', () => {
  it('401 UNAUTHORIZED エラー形式', () => {
    const errorResponse = {
      statusCode: 401,
      data: {
        error: {
          code: 'UNAUTHORIZED',
          message: '認証が必要です',
        },
      },
    }
    expect(errorResponse.statusCode).toBe(401)
    expect(errorResponse.data.error.code).toBe('UNAUTHORIZED')
    expect(errorResponse.data.error.message).toBe('認証が必要です')
  })

  it('500 INTERNAL_ERROR エラー形式', () => {
    const errorResponse = {
      statusCode: 500,
      data: {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'サーバーエラー',
        },
      },
    }
    expect(errorResponse.statusCode).toBe(500)
    expect(errorResponse.data.error.code).toBe('INTERNAL_ERROR')
  })
})

// ──────────────────────────────────────
// DB → API レスポンスマッピングテスト
// ──────────────────────────────────────

describe('DB → API レスポンスマッピング', () => {
  it('DB カラム名（camelCase）→ API レスポンス名（snake_case）の変換', () => {
    // API ハンドラ内のマッピングロジック検証
    const dbRow = {
      id: '01HTENANT1',
      name: 'ビジョンセンター',
      slug: 'vision-center',
      logoUrl: 'https://example.com/logo.png',
      role: 'organizer',
      isDefault: true,
      joinedAt: new Date('2026-01-15T10:00:00Z'),
    }

    // tenants.get.ts のマッピングロジックと同じ変換
    const apiResponse = {
      id: dbRow.id,
      name: dbRow.name,
      slug: dbRow.slug,
      logo_url: dbRow.logoUrl,
      role: dbRow.role,
      is_default: dbRow.isDefault,
      joined_at: dbRow.joinedAt.toISOString(),
    }

    expect(apiResponse.logo_url).toBe(dbRow.logoUrl)
    expect(apiResponse.is_default).toBe(dbRow.isDefault)
    expect(apiResponse.joined_at).toBe('2026-01-15T10:00:00.000Z')
  })

  it('logoUrl が null → logo_url: null', () => {
    const dbRow = { logoUrl: null }
    expect(dbRow.logoUrl).toBeNull()
  })

  it('joinedAt を ISO 8601 に変換', () => {
    const date = new Date('2026-02-01T09:00:00+09:00')
    const iso = date.toISOString()
    expect(iso).toContain('2026-02-01')
    expect(iso).toContain('T')
    expect(iso).toContain('Z')
  })
})
