// VENUE-001-004: 会場バリデーションスキーマ
// 仕様書: docs/design/features/project/VENUE-001-004_venue-management.md §3-F
import { z } from 'zod'

// ──────────────────────────────────────
// 定数定義
// ──────────────────────────────────────

export const VENUE_PLANS = ['pilot', 'standard', 'enterprise'] as const
export type VenuePlan = typeof VENUE_PLANS[number]

export const QUOTE_STATUSES = ['draft', 'sent', 'approved', 'rejected'] as const
export type QuoteStatus = typeof QUOTE_STATUSES[number]

// ──────────────────────────────────────
// 会場バリデーション (§3-F)
// ──────────────────────────────────────

/** 機材アイテムスキーマ */
const equipmentItemSchema = z.object({
  name: z.string().min(1).max(100),
  quantity: z.number().int().min(1).max(999),
  note: z.string().max(500).optional().default(''),
})

/** Wi-Fi情報スキーマ */
const wifiInfoSchema = z.object({
  ssid: z.string().min(1).max(100),
  password: z.string().max(100).optional(),
  bandwidth: z.string().max(50).optional(),
})

/** 会場作成スキーマ */
export const createVenueSchema = z.object({
  name: z.string().min(1, '会場名は必須です').max(200, '会場名は200文字以内で入力してください'),
  branch_name: z.string().max(255).optional(),
  address: z.string().max(500, '住所は500文字以内で入力してください').optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  capacity: z.number().int().min(1, '収容人数は1以上で入力してください').max(100000, '収容人数は100,000以下で入力してください').optional(),
  hourly_rate: z.number().int().min(0, '時間単価は0以上で入力してください').optional(),
  phone: z.string().max(20, '電話番号は20文字以内で入力してください').optional(),
  description: z.string().max(5000, '説明は5,000文字以内で入力してください').optional(),
  floor_map_url: z.string().url().optional(),
  equipment: z.array(equipmentItemSchema).max(50).optional().default([]),
  wifi_info: wifiInfoSchema.optional(),
  notes: z.string().max(5000).optional(),
})

/** 会場更新スキーマ（部分更新） */
export const updateVenueSchema = createVenueSchema.partial()

/** 会場検索スキーマ */
export const searchVenueSchema = z.object({
  area: z.string().max(100).optional(),
  capacity_min: z.number().int().min(1).optional(),
  capacity_max: z.number().int().max(100000).optional(),
  is_active: z.boolean().optional(),
})

// ──────────────────────────────────────
// 配信パッケージバリデーション
// ──────────────────────────────────────

/** パッケージ項目スキーマ */
const packageItemSchema = z.object({
  name: z.string().min(1).max(100),
  quantity: z.number().int().min(1).max(999),
  unit: z.string().max(20),
})

/** 配信パッケージ作成スキーマ */
export const createStreamingPackageSchema = z.object({
  name: z.string().min(1, 'パッケージ名は必須です').max(100, 'パッケージ名は100文字以内で入力してください'),
  description: z.string().max(5000).optional(),
  items: z.array(packageItemSchema).min(1, '構成項目は1つ以上必要です').max(50),
  base_price: z.number().int().min(0, '基本料金は0以上で入力してください'),
})

/** 配信パッケージ更新スキーマ（部分更新） */
export const updateStreamingPackageSchema = createStreamingPackageSchema.partial().extend({
  is_active: z.boolean().optional(),
})

// ──────────────────────────────────────
// 見積りバリデーション
// ──────────────────────────────────────

/** 見積り項目スキーマ */
const quoteItemSchema = z.object({
  category: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  unit_price: z.number().int().min(0),
  quantity: z.number().int().min(1),
  subtotal: z.number().int().min(0),
})

/** 見積り作成スキーマ */
export const createQuoteSchema = z.object({
  event_id: z.string().min(1, 'イベントIDは必須です'),
  venue_id: z.string().min(1, '会場IDは必須です'),
  items: z.array(quoteItemSchema).min(1, '見積り項目は1つ以上必要です').max(100),
  subtotal: z.number().int().min(0),
  tax: z.number().int().min(0),
  total: z.number().int().min(0),
  valid_days: z.number().int().min(1, '有効期限は1日以上').max(365, '有効期限は365日以内').optional().default(30),
})

// ──────────────────────────────────────
// テナントバリデーション (VENUE-004)
// ──────────────────────────────────────

/** テナント作成スキーマ */
export const createTenantSchema = z.object({
  name: z.string().min(1, 'テナント名は必須です').max(255),
  slug: z.string()
    .min(3, 'スラッグは3文字以上で入力してください')
    .max(50, 'スラッグは50文字以内で入力してください')
    .regex(/^[a-z0-9-]+$/, 'スラッグは英数字とハイフンのみ使用できます'),
  logo_url: z.string().url().optional(),
  plan: z.enum(VENUE_PLANS).optional().default('pilot'),
  settings: z.record(z.unknown()).optional().default({}),
})

/** テナント更新スキーマ（部分更新） */
export const updateTenantSchema = createTenantSchema.partial().extend({
  is_active: z.boolean().optional(),
})
