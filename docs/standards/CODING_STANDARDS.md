# CODING_STANDARDS.md - コーディング規約

> プロジェクト全体で統一するコーディングルール

---

## 基本情報

| 項目 | 内容 |
|------|------|
| プロジェクト名 | Haishin+ HUB |
| 言語 | TypeScript |
| フレームワーク | Nuxt 3 (Vue 3 + Nitro) |
| UI | Nuxt UI v3 (Tailwind CSS v4) |
| ORM | Drizzle ORM |
| 最終更新日 | 2026-02-08 |

---

## 1. 命名規則

### 1.1 ファイル・ディレクトリ

| 種類 | 規則 | 例 |
|------|------|-----|
| ディレクトリ | kebab-case | `user-settings/` |
| Vue コンポーネント | PascalCase | `UserProfile.vue` |
| Nuxt ページ | kebab-case | `pages/event-detail.vue` |
| Composable | camelCase (use 接頭辞) | `composables/useAuth.ts` |
| Server API | kebab-case | `server/api/events/[id].get.ts` |
| その他のファイル | kebab-case | `api-client.ts` |
| テストファイル | 同名 + `.test` | `api-client.test.ts` |
| 型定義ファイル | 同名 + `.types` | `user.types.ts` |

### 1.2 変数・関数

| 種類 | 規則 | 例 |
|------|------|-----|
| 変数 | camelCase | `userName` |
| 定数 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 関数 | camelCase | `getUserById()` |
| Composable | use + PascalCase | `useAuth()` |
| 型/インターフェース | PascalCase | `UserProfile` |
| Enum | PascalCase + UPPER_SNAKE_CASE | `enum Status { ACTIVE, INACTIVE }` |
| 真偽値変数 | is/has/can + 名詞 | `isLoading`, `hasError`, `canEdit` |
| イベントハンドラ | handle + イベント名 | `handleClick`, `handleSubmit` |
| emit イベント名 | kebab-case | `emit('update:model-value')` |

### 1.3 Vue コンポーネント

| 種類 | 規則 | 例 |
|------|------|-----|
| コンポーネントファイル | PascalCase.vue | `UserProfile.vue` |
| テンプレート内の参照 | PascalCase | `<UserProfile />` |
| Props 型 | コンポーネント名 + Props | `UserProfileProps` |
| Emit 型 | コンポーネント名 + Emits | `UserProfileEmits` |
| Composable | use + 名詞 | `useUserProfile` |

### 1.4 API・DB

| 種類 | 規則 | 例 |
|------|------|-----|
| API エンドポイント | kebab-case, 複数形 | `/api/v1/user-profiles` |
| テーブル名 | snake_case, 複数形 | `user_profiles` |
| カラム名 | snake_case | `created_at` |
| Drizzle スキーマ変数 | camelCase | `userProfiles` |

---

## 2. ディレクトリ構造

### 2.1 プロジェクト構造

```
.
├── CLAUDE.md
├── nuxt.config.ts
├── app.vue
├── assets/                    # 静的アセット（CSS等）
│   └── css/
│       └── main.css
├── components/                # コンポーネント
│   ├── ui/                    # UIプリミティブ（Nuxt UI で提供されないもの）
│   ├── forms/                 # フォーム関連
│   ├── layouts/               # レイアウト部品（Header, Sidebar等）
│   └── features/              # 機能別コンポーネント
│       ├── auth/
│       ├── event/
│       └── task/
├── composables/               # Composables（Vue 3 Composition API）
│   ├── useAuth.ts
│   ├── useEvent.ts
│   └── useTenant.ts
├── layouts/                   # Nuxt レイアウト
│   ├── default.vue
│   ├── auth.vue
│   └── dashboard.vue
├── middleware/                # クライアントミドルウェア
│   └── auth.ts
├── pages/                     # Nuxt ページ（ファイルベースルーティング）
│   ├── index.vue
│   ├── login.vue
│   ├── signup.vue
│   └── app/
│       ├── index.vue          # ダッシュボード
│       ├── events/
│       └── settings/
├── plugins/                   # Nuxt プラグイン
├── server/                    # Nitro サーバー
│   ├── api/                   # API Routes
│   │   ├── auth/
│   │   │   └── [...all].ts    # Better Auth ハンドラ
│   │   ├── events/
│   │   ├── tasks/
│   │   └── ai/
│   ├── middleware/            # サーバーミドルウェア
│   │   ├── auth.ts
│   │   └── tenant.ts
│   ├── utils/                 # サーバーユーティリティ
│   │   ├── db.ts              # Drizzle ORM インスタンス
│   │   ├── ai.ts              # LLM 抽象化レイヤー
│   │   └── mail.ts
│   └── database/              # DB 関連
│       ├── schema/            # Drizzle スキーマ定義
│       │   ├── users.ts
│       │   ├── events.ts
│       │   └── index.ts
│       ├── migrations/        # マイグレーションファイル
│       └── seed.ts            # シードデータ
├── stores/                    # Pinia ストア
│   ├── auth.ts
│   └── event.ts
├── types/                     # 共有型定義
│   ├── api.types.ts
│   ├── event.types.ts
│   └── user.types.ts
├── utils/                     # クライアントユーティリティ
│   └── format.ts
├── tests/                     # テスト
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── factories/
└── docs/                      # ドキュメント（SSOT）
```

### 2.2 コンポーネント構造

```
components/features/event/
├── EventCard.vue              # メインコンポーネント
├── EventCard.test.ts          # テスト
├── EventTimeline.vue          # サブコンポーネント
├── event-card.types.ts        # 型定義
└── index.ts                   # エクスポート
```

---

## 3. TypeScript

### 3.1 型定義

```typescript
// ✅ Good: インターフェースで型定義
interface User {
  id: string;
  name: string;
  email: string;
}

// ✅ Good: 型エイリアスは Union/Intersection に使用
type EventStatus = 'draft' | 'published' | 'completed' | 'cancelled';
type UserWithRole = User & { role: RoleType };

// ❌ Bad: any は使用しない
const data: any = fetchData();

// ✅ Good: unknown を使用し、型ガードで絞り込む
const data: unknown = fetchData();
if (isUser(data)) {
  console.log(data.name);
}
```

### 3.2 Null/Undefined

```typescript
// ✅ Good: オプショナルチェーン
const name = user?.profile?.name;

// ✅ Good: Nullish Coalescing
const displayName = user.name ?? 'Anonymous';

// ❌ Bad: 非nullアサーション（極力避ける）
const name = user!.name;
```

### 3.3 型のエクスポート

```typescript
// types/user.types.ts
export interface User {
  id: string;
  name: string;
}

export type UserStatus = 'active' | 'inactive';

// 使用側
import type { User, UserStatus } from '~/types/user.types';
```

---

## 4. Vue 3 / Nuxt 3

### 4.1 コンポーネント定義

```vue
<script setup lang="ts">
// ✅ Good: <script setup> + TypeScript

interface Props {
  event: Event;
  editable?: boolean;
}

interface Emits {
  (e: 'update', value: Event): void;
  (e: 'delete', id: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  editable: false,
});

const emit = defineEmits<Emits>();

// Composable の使用
const { user } = useAuth();

// リアクティブな状態
const isExpanded = ref(false);

// 算出プロパティ
const canEdit = computed(() => props.editable && user.value?.role === 'organizer');

// メソッド
function handleDelete() {
  emit('delete', props.event.id);
}
</script>

<template>
  <div>
    <h2>{{ event.title }}</h2>
    <UButton v-if="canEdit" @click="handleDelete">削除</UButton>
  </div>
</template>
```

### 4.2 Composables

```typescript
// composables/useEvent.ts
// ✅ Good: Composable の命名と構造
export function useEvent(eventId: MaybeRef<string>) {
  const id = toRef(eventId);

  const { data: event, status, error, refresh } = useFetch(
    () => `/api/v1/events/${id.value}`,
  );

  const isLoading = computed(() => status.value === 'pending');

  return { event, isLoading, error, refresh };
}
```

### 4.3 Server API Routes

```typescript
// server/api/events/[id].get.ts
// ✅ Good: Nitro API ルートの定義
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, message: 'Event ID is required' });
  }

  const result = await db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  if (result.length === 0) {
    throw createError({ statusCode: 404, message: 'Event not found' });
  }

  return result[0];
});
```

### 4.4 Pinia ストア

```typescript
// stores/auth.ts
// ✅ Good: Setup Store パターン（Composition API スタイル）
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const isAuthenticated = computed(() => user.value !== null);

  async function login(email: string, password: string) {
    // Better Auth のログイン
  }

  function logout() {
    user.value = null;
    navigateTo('/login');
  }

  return { user, isAuthenticated, login, logout };
});
```

---

## 5. インポート

### 5.1 インポート順序

```typescript
// 1. Vue / Nuxt（auto-import されるため通常不要）
// import { ref, computed } from 'vue';

// 2. 外部ライブラリ
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';

// 3. 内部モジュール（Nuxt エイリアス）
import { events, users } from '~/server/database/schema';
import { validateRequest } from '~/server/utils/validation';

// 4. 型（type import）
import type { Event, EventStatus } from '~/types/event.types';

// 5. 相対パス（同階層・下位）
import EventCard from './EventCard.vue';
```

### 5.2 Nuxt Auto-Import

```typescript
// Nuxt 3 では以下が自動インポートされる（明示不要）:
// - Vue API: ref, computed, watch, onMounted 等
// - Nuxt API: useFetch, useRoute, navigateTo 等
// - composables/ 内のエクスポート
// - utils/ 内のエクスポート
// - Pinia: defineStore, storeToRefs 等

// ❌ Bad: auto-import されるものを手動で import しない
import { ref } from 'vue';

// ✅ Good: そのまま使う
const count = ref(0);
```

---

## 6. コメント

### 6.1 基本ルール

```typescript
// ✅ Good: WHY（なぜ）を説明
// Better Auth の Organization プラグインは tenant_id を session.organizationId に格納する
const tenantId = session.organizationId;

// ❌ Bad: WHAT（何を）は自明なので不要
// eventIdでイベントを取得
const event = await getEvent(eventId);
```

### 6.2 TODO/FIXME

```typescript
// TODO: パフォーマンス改善 - キャッシュ導入を検討
// FIXME: エッジケースでnullが返る可能性あり
// HACK: 一時的な回避策、Issue #123 で修正予定
```

---

## 7. エラーハンドリング

### 7.1 サーバー側

```typescript
// ✅ Good: Nitro の createError を使用
export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation Error',
      data: { errors: parsed.error.flatten().fieldErrors },
    });
  }

  // ビジネスロジックのエラー
  const user = await findUser(parsed.data.email);
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'メールアドレスまたはパスワードが正しくありません',
    });
  }
});
```

### 7.2 クライアント側

```typescript
// ✅ Good: useFetch のエラーハンドリング
const { data, error } = await useFetch('/api/v1/events');

if (error.value) {
  // エラー通知を表示
  const toast = useToast();
  toast.add({ title: 'エラー', description: error.value.message, color: 'error' });
}
```

---

## 8. バリデーション

### 8.1 Zod スキーマ

```typescript
// ✅ Good: Zod でバリデーションスキーマを定義
import { z } from 'zod';

export const createEventSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(200),
  description: z.string().max(5000).optional(),
  eventDate: z.string().datetime(),
  format: z.enum(['onsite', 'online', 'hybrid']),
  maxParticipants: z.number().int().positive().max(10000),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
```

### 8.2 Drizzle スキーマとの連携

```typescript
// server/database/schema/events.ts
import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const events = pgTable('events', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  eventDate: timestamp('event_date').notNull(),
  maxParticipants: integer('max_participants').notNull(),
});

// Drizzle スキーマから Zod スキーマを自動生成
export const insertEventSchema = createInsertSchema(events);
export const selectEventSchema = createSelectSchema(events);
```

---

## 9. フォーマット設定

### 9.1 ESLint

```typescript
// eslint.config.mjs（Nuxt の @nuxt/eslint を使用）
import { createConfigForNuxt } from '@nuxt/eslint-config/flat';

export default createConfigForNuxt({
  features: {
    tooling: true,
    stylistic: true,
  },
}).append({
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
});
```

---

## 10. Git コミット前チェック

### 10.1 lint-staged

```json
// package.json
{
  "lint-staged": {
    "*.{ts,vue}": [
      "eslint --fix"
    ]
  }
}
```

### 10.2 husky

```bash
# .husky/pre-commit
pnpm lint-staged
pnpm typecheck
```

---

## 11. 禁止事項

| 禁止事項 | 理由 | 代替案 |
|---------|------|-------|
| `any` 型の使用 | 型安全性が失われる | `unknown` + 型ガード |
| `// @ts-ignore` | 型エラーを隠蔽 | 適切な型定義 |
| `console.log` (本番) | デバッグコードの残留 | ロガー（Pino）を使用 |
| マジックナンバー | 意味が不明 | 定数として定義 |
| ネストの深いコード | 可読性低下 | 早期リターン、関数分割 |
| Options API | Composition API に統一 | `<script setup>` を使用 |
| 環境変数のハードコード | セキュリティリスク | `useRuntimeConfig()` を使用 |
| エラーの握りつぶし | デバッグ困難 | 必ずハンドリングする |

---

## 変更履歴

| 日付 | 変更内容 | 変更者 |
|------|---------|-------|
| 2026-02-08 | 初版作成（Nuxt 3 / Vue 3 / Drizzle ORM 向けにカスタマイズ） | AI |
