// シードデータ投入スクリプト
// pnpm db:seed で実行
//
// テスト用アカウント・テナント・紐付データを投入する。
// 既存レコードがあればスキップ（冪等性を保証）。

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL
  || process.env.NUXT_DATABASE_URL
  || 'postgresql://postgres:postgres@localhost:5432/haishin_plus_hub';

const sql = postgres(DATABASE_URL);

// ─── テストデータ定義 ───

const TEST_TENANT = {
  id: '01JTEST0000TENANT000000001',
  name: 'テスト組織',
  slug: 'test-org',
  plan: 'pilot',
};

// テストユーザー情報（Better Auth で作成済みの想定）
// admin@test.com / Test1234 でサインアップ後に紐付け
const TEST_USER_EMAIL = 'admin@test.com';

const TEST_USER_TENANT = {
  id: '01JTEST0000USERTENANT0001',
  role: 'tenant_admin',
  isDefault: true,
};

// ─── メイン処理 ───

async function main() {
  console.log('🌱 Seeding database...');
  console.log(`   DATABASE_URL: ${DATABASE_URL.replace(/\/\/.*@/, '//***@')}`);

  // 1. テナント
  await upsertTenant();

  // 2. テストユーザーとテナントの紐付
  await upsertUserTenant();

  console.log('✅ Seeding complete.');
  await sql.end();
}

async function upsertTenant() {
  const existing = await sql`SELECT id FROM tenant WHERE id = ${TEST_TENANT.id}`;
  if (existing.length > 0) {
    console.log(`   [skip] tenant "${TEST_TENANT.name}" already exists`);
    return;
  }

  await sql`
    INSERT INTO tenant (id, name, slug, plan, is_active, created_at, updated_at)
    VALUES (
      ${TEST_TENANT.id},
      ${TEST_TENANT.name},
      ${TEST_TENANT.slug},
      ${TEST_TENANT.plan},
      true,
      NOW(),
      NOW()
    )
  `;
  console.log(`   [created] tenant "${TEST_TENANT.name}" (${TEST_TENANT.slug})`);
}

async function upsertUserTenant() {
  // テストユーザーを email で検索
  const users = await sql`SELECT id FROM "user" WHERE email = ${TEST_USER_EMAIL}`;
  if (users.length === 0) {
    console.log(`   [skip] user "${TEST_USER_EMAIL}" not found — sign up first via Better Auth`);
    return;
  }

  const userId = users[0]!.id;

  const existing = await sql`
    SELECT id FROM user_tenant
    WHERE user_id = ${userId} AND tenant_id = ${TEST_TENANT.id}
  `;
  if (existing.length > 0) {
    console.log(`   [skip] user_tenant for "${TEST_USER_EMAIL}" already exists`);
    return;
  }

  await sql`
    INSERT INTO user_tenant (id, user_id, tenant_id, role, is_default, joined_at, created_at, updated_at)
    VALUES (
      ${TEST_USER_TENANT.id},
      ${userId},
      ${TEST_TENANT.id},
      ${TEST_USER_TENANT.role},
      ${TEST_USER_TENANT.isDefault},
      NOW(),
      NOW(),
      NOW()
    )
  `;
  console.log(`   [created] user_tenant "${TEST_USER_EMAIL}" → "${TEST_TENANT.name}" (${TEST_USER_TENANT.role})`);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
