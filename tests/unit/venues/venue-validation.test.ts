// VENUE-001-004 §3-F: 会場バリデーションテスト
import { describe, it, expect } from 'vitest'
import {
  createVenueSchema,
  updateVenueSchema,
  searchVenueSchema,
  createStreamingPackageSchema,
  updateStreamingPackageSchema,
  createQuoteSchema,
  createTenantSchema,
  updateTenantSchema,
  VENUE_PLANS,
  QUOTE_STATUSES,
} from '~/server/utils/venue-validation'

// ──────────────────────────────────────
// createVenueSchema テスト (§3-F)
// ──────────────────────────────────────

describe('createVenueSchema', () => {
  const validPayload = {
    name: '渋谷ホールA',
    branch_name: '渋谷店',
    address: '東京都渋谷区神南1-2-3',
    capacity: 200,
    hourly_rate: 50000,
  }

  it('正常なペイロードでバリデーション成功', () => {
    const result = createVenueSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('会場名のみで成功（最小ペイロード）', () => {
    const result = createVenueSchema.safeParse({ name: 'ホール' })
    expect(result.success).toBe(true)
  })

  // §3-F: name 1-200文字
  it('会場名空文字 → エラー', () => {
    const result = createVenueSchema.safeParse({ ...validPayload, name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toBeDefined()
    }
  })

  it('会場名201文字 → エラー', () => {
    const result = createVenueSchema.safeParse({ ...validPayload, name: 'a'.repeat(201) })
    expect(result.success).toBe(false)
  })

  it('会場名200文字 → 成功', () => {
    const result = createVenueSchema.safeParse({ ...validPayload, name: 'a'.repeat(200) })
    expect(result.success).toBe(true)
  })

  it('会場名1文字 → 成功', () => {
    const result = createVenueSchema.safeParse({ ...validPayload, name: 'A' })
    expect(result.success).toBe(true)
  })

  // §3-F: address 500文字
  it('住所501文字 → エラー', () => {
    const result = createVenueSchema.safeParse({ ...validPayload, address: 'a'.repeat(501) })
    expect(result.success).toBe(false)
  })

  it('住所500文字 → 成功', () => {
    const result = createVenueSchema.safeParse({ ...validPayload, address: 'a'.repeat(500) })
    expect(result.success).toBe(true)
  })

  // §3-F: capacity 1-100,000
  it('収容人数0 → エラー', () => {
    const result = createVenueSchema.safeParse({ ...validPayload, capacity: 0 })
    expect(result.success).toBe(false)
  })

  it('収容人数1 → 成功', () => {
    const result = createVenueSchema.safeParse({ ...validPayload, capacity: 1 })
    expect(result.success).toBe(true)
  })

  it('収容人数100001 → エラー', () => {
    const result = createVenueSchema.safeParse({ ...validPayload, capacity: 100001 })
    expect(result.success).toBe(false)
  })

  it('収容人数100000 → 成功', () => {
    const result = createVenueSchema.safeParse({ ...validPayload, capacity: 100000 })
    expect(result.success).toBe(true)
  })

  // §3-F: hourly_rate 0以上
  it('時間単価-1 → エラー', () => {
    const result = createVenueSchema.safeParse({ ...validPayload, hourly_rate: -1 })
    expect(result.success).toBe(false)
  })

  it('時間単価0（無料会場） → 成功', () => {
    const result = createVenueSchema.safeParse({ ...validPayload, hourly_rate: 0 })
    expect(result.success).toBe(true)
  })

  // §3-F: phone 20文字
  it('電話番号21文字 → エラー', () => {
    const result = createVenueSchema.safeParse({ ...validPayload, phone: '0'.repeat(21) })
    expect(result.success).toBe(false)
  })

  it('電話番号20文字 → 成功', () => {
    const result = createVenueSchema.safeParse({ ...validPayload, phone: '0'.repeat(20) })
    expect(result.success).toBe(true)
  })

  // §3-F: description 5,000文字
  it('説明5001文字 → エラー', () => {
    const result = createVenueSchema.safeParse({ ...validPayload, description: 'a'.repeat(5001) })
    expect(result.success).toBe(false)
  })

  it('説明5000文字 → 成功', () => {
    const result = createVenueSchema.safeParse({ ...validPayload, description: 'a'.repeat(5000) })
    expect(result.success).toBe(true)
  })

  // 機材
  it('機材付きペイロード → 成功', () => {
    const result = createVenueSchema.safeParse({
      ...validPayload,
      equipment: [
        { name: 'プロジェクター', quantity: 2, note: '4K対応' },
        { name: 'ワイヤレスマイク', quantity: 4 },
      ],
    })
    expect(result.success).toBe(true)
  })

  // Wi-Fi
  it('Wi-Fi情報付きペイロード → 成功', () => {
    const result = createVenueSchema.safeParse({
      ...validPayload,
      wifi_info: { ssid: 'EVENT-WIFI', password: 'pass123', bandwidth: '1Gbps' },
    })
    expect(result.success).toBe(true)
  })
})

// ──────────────────────────────────────
// updateVenueSchema テスト
// ──────────────────────────────────────

describe('updateVenueSchema', () => {
  it('空オブジェクト（部分更新なし）→ 成功', () => {
    const result = updateVenueSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('会場名のみ更新 → 成功', () => {
    const result = updateVenueSchema.safeParse({ name: '更新ホール' })
    expect(result.success).toBe(true)
  })

  it('収容人数のみ更新 → 成功', () => {
    const result = updateVenueSchema.safeParse({ capacity: 300 })
    expect(result.success).toBe(true)
  })
})

// ──────────────────────────────────────
// searchVenueSchema テスト
// ──────────────────────────────────────

describe('searchVenueSchema', () => {
  it('空クエリ → 成功', () => {
    const result = searchVenueSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('エリア指定 → 成功', () => {
    const result = searchVenueSchema.safeParse({ area: 'tokyo' })
    expect(result.success).toBe(true)
  })

  it('収容人数範囲指定 → 成功', () => {
    const result = searchVenueSchema.safeParse({ capacity_min: 50, capacity_max: 200 })
    expect(result.success).toBe(true)
  })
})

// ──────────────────────────────────────
// createStreamingPackageSchema テスト
// ──────────────────────────────────────

describe('createStreamingPackageSchema', () => {
  const validPayload = {
    name: 'スタンダード配信',
    description: '基本的な配信サービス',
    items: [
      { name: 'カメラ1台', quantity: 1, unit: '台' },
      { name: '配信オペレーター', quantity: 1, unit: '名' },
    ],
    base_price: 50000,
  }

  it('正常なペイロード → 成功', () => {
    const result = createStreamingPackageSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  // §3-F: パッケージ名 1-100文字
  it('パッケージ名空 → エラー', () => {
    const result = createStreamingPackageSchema.safeParse({ ...validPayload, name: '' })
    expect(result.success).toBe(false)
  })

  it('パッケージ名101文字 → エラー', () => {
    const result = createStreamingPackageSchema.safeParse({ ...validPayload, name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('パッケージ名100文字 → 成功', () => {
    const result = createStreamingPackageSchema.safeParse({ ...validPayload, name: 'a'.repeat(100) })
    expect(result.success).toBe(true)
  })

  it('構成項目空配列 → エラー', () => {
    const result = createStreamingPackageSchema.safeParse({ ...validPayload, items: [] })
    expect(result.success).toBe(false)
  })

  it('基本料金-1 → エラー', () => {
    const result = createStreamingPackageSchema.safeParse({ ...validPayload, base_price: -1 })
    expect(result.success).toBe(false)
  })

  it('基本料金0 → 成功', () => {
    const result = createStreamingPackageSchema.safeParse({ ...validPayload, base_price: 0 })
    expect(result.success).toBe(true)
  })
})

// ──────────────────────────────────────
// updateStreamingPackageSchema テスト
// ──────────────────────────────────────

describe('updateStreamingPackageSchema', () => {
  it('空オブジェクト → 成功', () => {
    const result = updateStreamingPackageSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('is_active 更新 → 成功', () => {
    const result = updateStreamingPackageSchema.safeParse({ is_active: false })
    expect(result.success).toBe(true)
  })

  it('価格のみ更新 → 成功', () => {
    const result = updateStreamingPackageSchema.safeParse({ base_price: 80000 })
    expect(result.success).toBe(true)
  })
})

// ──────────────────────────────────────
// createQuoteSchema テスト
// ──────────────────────────────────────

describe('createQuoteSchema', () => {
  const validPayload = {
    event_id: '01ABCDE',
    venue_id: '01FGHIJ',
    items: [
      { category: '会場費', name: 'ホール使用料', unit_price: 100000, quantity: 1, subtotal: 100000 },
    ],
    subtotal: 100000,
    tax: 10000,
    total: 110000,
  }

  it('正常なペイロード → 成功', () => {
    const result = createQuoteSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('event_id 空 → エラー', () => {
    const result = createQuoteSchema.safeParse({ ...validPayload, event_id: '' })
    expect(result.success).toBe(false)
  })

  it('venue_id 空 → エラー', () => {
    const result = createQuoteSchema.safeParse({ ...validPayload, venue_id: '' })
    expect(result.success).toBe(false)
  })

  it('items 空配列 → エラー', () => {
    const result = createQuoteSchema.safeParse({ ...validPayload, items: [] })
    expect(result.success).toBe(false)
  })

  // §3-F: 見積り有効期限 1-365日
  it('valid_days 0 → エラー', () => {
    const result = createQuoteSchema.safeParse({ ...validPayload, valid_days: 0 })
    expect(result.success).toBe(false)
  })

  it('valid_days 1 → 成功', () => {
    const result = createQuoteSchema.safeParse({ ...validPayload, valid_days: 1 })
    expect(result.success).toBe(true)
  })

  it('valid_days 366 → エラー', () => {
    const result = createQuoteSchema.safeParse({ ...validPayload, valid_days: 366 })
    expect(result.success).toBe(false)
  })

  it('valid_days 365 → 成功', () => {
    const result = createQuoteSchema.safeParse({ ...validPayload, valid_days: 365 })
    expect(result.success).toBe(true)
  })

  it('デフォルト valid_days = 30', () => {
    const result = createQuoteSchema.safeParse(validPayload)
    if (result.success) {
      expect(result.data.valid_days).toBe(30)
    }
  })
})

// ──────────────────────────────────────
// createTenantSchema テスト (VENUE-004)
// ──────────────────────────────────────

describe('createTenantSchema', () => {
  const validPayload = {
    name: 'T-SITE HALL',
    slug: 'tsite-hall',
  }

  it('正常なペイロード → 成功', () => {
    const result = createTenantSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('テナント名空 → エラー', () => {
    const result = createTenantSchema.safeParse({ ...validPayload, name: '' })
    expect(result.success).toBe(false)
  })

  // §3-F: slug 3-50文字、英数字・ハイフンのみ
  it('slug 2文字 → エラー', () => {
    const result = createTenantSchema.safeParse({ ...validPayload, slug: 'ab' })
    expect(result.success).toBe(false)
  })

  it('slug 3文字 → 成功', () => {
    const result = createTenantSchema.safeParse({ ...validPayload, slug: 'abc' })
    expect(result.success).toBe(true)
  })

  it('slug 51文字 → エラー', () => {
    const result = createTenantSchema.safeParse({ ...validPayload, slug: 'a'.repeat(51) })
    expect(result.success).toBe(false)
  })

  it('slug 50文字 → 成功', () => {
    const result = createTenantSchema.safeParse({ ...validPayload, slug: 'a'.repeat(50) })
    expect(result.success).toBe(true)
  })

  it('slug に大文字 → エラー', () => {
    const result = createTenantSchema.safeParse({ ...validPayload, slug: 'Tsite-Hall' })
    expect(result.success).toBe(false)
  })

  it('slug にアンダースコア → エラー', () => {
    const result = createTenantSchema.safeParse({ ...validPayload, slug: 'tsite_hall' })
    expect(result.success).toBe(false)
  })

  it('slug に日本語 → エラー', () => {
    const result = createTenantSchema.safeParse({ ...validPayload, slug: 'テスト' })
    expect(result.success).toBe(false)
  })

  it('デフォルト plan = pilot', () => {
    const result = createTenantSchema.safeParse(validPayload)
    if (result.success) {
      expect(result.data.plan).toBe('pilot')
    }
  })
})

// ──────────────────────────────────────
// updateTenantSchema テスト
// ──────────────────────────────────────

describe('updateTenantSchema', () => {
  it('空オブジェクト → 成功', () => {
    const result = updateTenantSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('is_active 更新 → 成功', () => {
    const result = updateTenantSchema.safeParse({ is_active: false })
    expect(result.success).toBe(true)
  })

  it('plan 変更 → 成功', () => {
    const result = updateTenantSchema.safeParse({ plan: 'enterprise' })
    expect(result.success).toBe(true)
  })
})

// ──────────────────────────────────────
// 定数テスト
// ──────────────────────────────────────

describe('定数定義', () => {
  it('VENUE_PLANS: 3種類', () => {
    expect(VENUE_PLANS).toHaveLength(3)
    expect(VENUE_PLANS).toContain('pilot')
    expect(VENUE_PLANS).toContain('standard')
    expect(VENUE_PLANS).toContain('enterprise')
  })

  it('QUOTE_STATUSES: 4種類', () => {
    expect(QUOTE_STATUSES).toHaveLength(4)
    expect(QUOTE_STATUSES).toContain('draft')
    expect(QUOTE_STATUSES).toContain('sent')
    expect(QUOTE_STATUSES).toContain('approved')
    expect(QUOTE_STATUSES).toContain('rejected')
  })
})
