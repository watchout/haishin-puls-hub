// ACCT-002 §6: プロフィール表示に必要なDBスキーマ検証
// Drizzle スキーマ定義が SSOT §6.2 の要件を満たすことを確認

import { describe, it, expect } from 'vitest'
import { user } from '~/server/database/schema/user'
import { userTenant } from '~/server/database/schema/user-tenant'
import { tenant } from '~/server/database/schema/tenant'

// ──────────────────────────────────────
// user テーブル (§6.2)
// ──────────────────────────────────────

describe('user テーブルスキーマ (§6.2)', () => {
  const columns = Object.keys(user)

  it('§6.2 必須カラム: id', () => {
    expect(columns).toContain('id')
  })

  it('§6.2 必須カラム: email', () => {
    expect(columns).toContain('email')
  })

  it('§6.2 必須カラム: name', () => {
    expect(columns).toContain('name')
  })

  it('§6.2 必須カラム: avatarUrl (avatar_url)', () => {
    expect(columns).toContain('avatarUrl')
  })

  it('§6.2 必須カラム: emailVerified (email_verified)', () => {
    expect(columns).toContain('emailVerified')
  })

  it('§6.2 必須カラム: isActive (is_active)', () => {
    expect(columns).toContain('isActive')
  })

  it('§6.2 必須カラム: lastLoginAt (last_login_at)', () => {
    expect(columns).toContain('lastLoginAt')
  })
})

// ──────────────────────────────────────
// user_tenant テーブル (§6.2)
// ──────────────────────────────────────

describe('user_tenant テーブルスキーマ (§6.2)', () => {
  const columns = Object.keys(userTenant)

  it('§6.2 必須カラム: userId (user_id)', () => {
    expect(columns).toContain('userId')
  })

  it('§6.2 必須カラム: tenantId (tenant_id)', () => {
    expect(columns).toContain('tenantId')
  })

  it('§6.2 必須カラム: role', () => {
    expect(columns).toContain('role')
  })

  it('§6.2 必須カラム: isDefault (is_default)', () => {
    expect(columns).toContain('isDefault')
  })

  it('§6.2 必須カラム: joinedAt (joined_at)', () => {
    expect(columns).toContain('joinedAt')
  })
})

// ──────────────────────────────────────
// tenant テーブル (§6.2)
// ──────────────────────────────────────

describe('tenant テーブルスキーマ (§6.2)', () => {
  const columns = Object.keys(tenant)

  it('§6.2 必須カラム: id', () => {
    expect(columns).toContain('id')
  })

  it('§6.2 必須カラム: name', () => {
    expect(columns).toContain('name')
  })

  it('§6.2 必須カラム: slug', () => {
    expect(columns).toContain('slug')
  })

  it('§6.2 必須カラム: logoUrl (logo_url)', () => {
    expect(columns).toContain('logoUrl')
  })
})
