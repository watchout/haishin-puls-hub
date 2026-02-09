# TESTING_STANDARDS.md - テスト規約

> テスト戦略、カバレッジ目標、テストの書き方

---

## 基本情報

| 項目 | 内容 |
|------|------|
| プロジェクト名 | Haishin+ HUB |
| テストフレームワーク | Vitest |
| コンポーネントテスト | @vue/test-utils + Vitest |
| E2Eフレームワーク | Playwright |
| 最終更新日 | 2026-02-08 |

---

## 1. テスト戦略

### 1.1 テストピラミッド

```
                    /\
                   /  \
                  / E2E \          少ない（重要フローのみ）
                 /──────\
                /        \
               / Integration\      中程度（API・DB連携）
              /──────────────\
             /                \
            /    Unit Tests    \   多い（ロジック・コンポーネント）
           /────────────────────\
```

### 1.2 テスト種別と目的

| 種別 | 対象 | ツール | 割合目安 |
|------|------|--------|---------|
| Unit | 関数、Composable、ユーティリティ | Vitest | 70% |
| Integration | Nitro API Routes、DB連携 | Vitest | 20% |
| E2E | ユーザーフロー（ログイン→ダッシュボード等） | Playwright | 10% |

---

## 2. カバレッジ目標

### 2.1 全体目標

| メトリクス | 目標 | 必須 |
|-----------|------|------|
| Line Coverage | 80% | 70% |
| Branch Coverage | 75% | 65% |
| Function Coverage | 85% | 75% |

### 2.2 カテゴリ別目標

| カテゴリ | 目標 | 理由 |
|---------|------|------|
| ビジネスロジック（server/utils/） | 90%+ | 重要なロジック |
| API ハンドラ（server/api/） | 80%+ | エラーケース含む |
| Composables | 80%+ | 共有ロジック |
| Vue コンポーネント | 70%+ | 主要な状態をカバー |
| ユーティリティ（utils/） | 95%+ | 単純で網羅しやすい |

### 2.3 カバレッジ除外

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      exclude: [
        'types/**',
        '**/*.types.ts',
        '**/*.config.*',
        '**/*.d.ts',
        'server/database/migrations/**',
        'server/database/seed.ts',
      ],
    },
  },
});
```

---

## 3. テストファイル配置

### 3.1 配置パターン（同階層配置）

```
server/
├── api/
│   ├── events/
│   │   ├── index.get.ts
│   │   └── index.get.test.ts       ← 同階層
│   └── auth/
│       ├── [...all].ts
│       └── [...all].test.ts
├── utils/
│   ├── ai.ts
│   └── ai.test.ts

composables/
├── useAuth.ts
└── useAuth.test.ts

components/features/auth/
├── LoginForm.vue
└── LoginForm.test.ts
```

### 3.2 E2E テストは tests/e2e/ に集約

```
tests/
├── e2e/
│   ├── auth/
│   │   └── login.e2e.ts
│   ├── event/
│   │   └── create-event.e2e.ts
│   └── fixtures/
│       └── test-users.ts
└── factories/
    ├── user.factory.ts
    └── event.factory.ts
```

### 3.3 命名規則

| 種別 | パターン | 例 |
|------|---------|-----|
| Unit | `{name}.test.ts` | `useAuth.test.ts` |
| Integration | `{name}.test.ts`（server/api/ 配下） | `index.get.test.ts` |
| E2E | `{flow}.e2e.ts` | `login.e2e.ts` |

---

## 4. テストの書き方

### 4.1 基本構造（AAA パターン）

```typescript
describe('EventService', () => {
  describe('createEvent', () => {
    it('should create event when valid data is provided', async () => {
      // Arrange（準備）
      const input = createEventInput({ title: 'テストセミナー' });

      // Act（実行）
      const result = await eventService.createEvent(input);

      // Assert（検証）
      expect(result.title).toBe('テストセミナー');
      expect(result.status).toBe('draft');
    });
  });
});
```

### 4.2 テスト命名規則

```typescript
// ✅ Good: should + 期待動作 + 条件
it('should return null when event is not found', () => {});
it('should throw error when title is empty', () => {});
it('should update event when user has organizer role', () => {});

// ❌ Bad: 曖昧、条件がない
it('works correctly', () => {});
it('handles event', () => {});
```

### 4.3 describe のネスト

```typescript
describe('AuthService', () => {
  describe('login', () => {
    describe('when credentials are valid', () => {
      it('should return session token', () => {});
      it('should set tenant context', () => {});
    });

    describe('when password is incorrect', () => {
      it('should throw AuthenticationError', () => {});
    });

    describe('when account is locked', () => {
      it('should throw AccountLockedError', () => {});
    });
  });
});
```

---

## 5. モック

### 5.1 モック方針

| 対象 | モック | 理由 |
|------|-------|------|
| 外部API（Claude/GPT） | ✅ する | 不安定、コスト |
| データベース | ✅ する（Unit） | 速度 |
| メール送信 | ✅ する | 副作用 |
| 日時 | ✅ する | 再現性 |
| Better Auth | ✅ する（Unit） | 外部依存 |

### 5.2 モックの書き方

```typescript
// Drizzle ORM のモック
vi.mock('~/server/utils/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
  },
}));

// LLM のモック
vi.mock('~/server/utils/ai', () => ({
  createLLMClient: vi.fn().mockReturnValue({
    generateText: vi.fn().mockResolvedValue({ text: 'AI response' }),
  }),
}));

// 日時のモック
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-02-08'));
});

afterEach(() => {
  vi.useRealTimers();
});
```

### 5.3 モックのリセット

```typescript
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.resetAllMocks();
});
```

---

## 6. Vue コンポーネントテスト

### 6.1 @vue/test-utils

```typescript
import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import LoginForm from './LoginForm.vue';

describe('LoginForm', () => {
  it('should emit submit event with email and password', async () => {
    const wrapper = mount(LoginForm);

    // 入力
    await wrapper.find('input[name="email"]').setValue('test@example.com');
    await wrapper.find('input[name="password"]').setValue('password123');

    // 送信
    await wrapper.find('form').trigger('submit');

    // 検証
    expect(wrapper.emitted('submit')).toBeTruthy();
    expect(wrapper.emitted('submit')![0]).toEqual([
      { email: 'test@example.com', password: 'password123' },
    ]);
  });

  it('should show validation error when email is empty', async () => {
    const wrapper = mount(LoginForm);

    await wrapper.find('form').trigger('submit');

    expect(wrapper.text()).toContain('メールアドレスは必須です');
  });
});
```

### 6.2 Composable テスト

```typescript
import { describe, it, expect } from 'vitest';
import { useEvent } from './useEvent';

describe('useEvent', () => {
  it('should fetch event by id', async () => {
    // useFetch をモック（Nuxt auto-import）
    const mockEvent = { id: '1', title: 'テストセミナー' };

    // Composable を実行
    const { event, isLoading } = useEvent('1');

    // 検証
    expect(isLoading.value).toBe(true);
  });
});
```

---

## 7. Nitro API テスト

### 7.1 API ハンドラテスト

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('GET /api/v1/events', () => {
  it('should return events list', async () => {
    // Nitro のテストユーティリティを使用
    const result = await $fetch('/api/v1/events', {
      method: 'GET',
      headers: { Authorization: 'Bearer test-token' },
    });

    expect(result).toHaveProperty('data');
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('should return 401 when not authenticated', async () => {
    await expect(
      $fetch('/api/v1/events', { method: 'GET' }),
    ).rejects.toThrow();
  });
});
```

---

## 8. E2Eテスト

### 8.1 Playwright 設定

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

### 8.2 E2E テスト例

```typescript
// tests/e2e/auth/login.e2e.ts
import { test, expect } from '@playwright/test';

test.describe('ログインフロー', () => {
  test('正しい認証情報でログインできる', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/app');
    await expect(page.locator('text=ダッシュボード')).toBeVisible();
  });

  test('不正な認証情報でエラーが表示される', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'wrong-password');
    await page.click('button[type="submit"]');

    await expect(
      page.locator('text=メールアドレスまたはパスワードが正しくありません'),
    ).toBeVisible();
  });
});
```

---

## 9. テストデータ

### 9.1 Factory パターン

```typescript
// tests/factories/event.factory.ts
import type { Event } from '~/types/event.types';

let counter = 0;

export function createEvent(overrides?: Partial<Event>): Event {
  counter++;
  return {
    id: `evt-${counter}`,
    title: `テストイベント ${counter}`,
    description: 'テスト用のイベントです',
    eventDate: new Date('2026-04-01'),
    format: 'hybrid',
    status: 'draft',
    tenantId: 'tenant-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createEventInput(overrides?: Partial<Event>) {
  const event = createEvent(overrides);
  const { id, createdAt, updatedAt, ...input } = event;
  return input;
}
```

### 9.2 Fixture

```typescript
// tests/e2e/fixtures/test-users.ts
export const testUsers = {
  organizer: {
    email: 'organizer@example.com',
    password: 'test-password-123',
    role: 'organizer',
  },
  venueStaff: {
    email: 'venue@example.com',
    password: 'test-password-123',
    role: 'venue_staff',
  },
  streamingOperator: {
    email: 'streaming@example.com',
    password: 'test-password-123',
    role: 'streaming_operator',
  },
};
```

---

## 10. CI 設定

### 10.1 GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: haishin_plus_hub_test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm test:coverage

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm exec playwright install --with-deps
      - run: pnpm test:e2e

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 11. チェックリスト

### 11.1 テスト作成時

- [ ] 正常系をテストした
- [ ] 異常系（エラーケース）をテストした
- [ ] 境界値をテストした
- [ ] 権限チェックをテストした（ロール別）
- [ ] テナント分離をテストした（マルチテナント）
- [ ] モックを適切に使用した
- [ ] テスト名が明確

### 11.2 PRレビュー時

- [ ] テストが追加/更新されている
- [ ] カバレッジが下がっていない
- [ ] テストが実際に動作を検証している
- [ ] フレイキー（不安定）なテストがない

---

## 変更履歴

| 日付 | 変更内容 | 変更者 |
|------|---------|-------|
| 2026-02-08 | 初版作成（Vitest + Playwright + Vue/Nuxt 向けにカスタマイズ） | AI |
