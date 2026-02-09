# Haishin+ HUB ドキュメント INDEX

> このファイルはプロジェクトの全ドキュメントの配置と関係性を管理する。
> 新しいドキュメントを追加した場合は、必ずこのINDEXを更新すること。

---

## ドキュメント一覧

### ルートレベル

| ファイル | 内容 | ステータス |
|---|---|---|
| `README.md` | プロジェクト概要・コンセプト・ビジネスゴール・コア機能・技術前提 | ✅ 作成済 |
| `CLAUDE.md` | Claude Code 用プロジェクト指示書 | ✅ 作成済 |
| `.gitignore` | Git除外設定 | ✅ 作成済 |

---

### docs/idea/ — アイデア・検証フェーズ

| ファイル | 内容 | ステータス |
|---|---|---|
| `IDEA_CANVAS.md` | ビジネスアイデアキャンバス | ✅ 作成済（README.md §1-3 + jv-proposal-venue.md から生成） |
| `USER_PERSONA.md` | ユーザーペルソナ定義（7ペルソナ） | ✅ 作成済（persona-stories.md + pain-points.md から生成） |
| `VALUE_PROPOSITION.md` | 価値提案キャンバス | ✅ 作成済（README.md §4 + pain-points.md + persona-feature-mapping.md から生成） |
| `COMPETITOR_ANALYSIS.md` | 競合分析（EventHub中心） | ✅ 作成済 |

**元ネタとなる既存資料：**

| 既存ファイル | 内容 | 場所 |
|---|---|---|
| `persona-stories.md` | 7ペルソナの理想体験ストーリー | `docs/persona-stories.md` |
| `pain-points.md` | ペルソナ別ペイン × 解消体験 | `docs/pain-points.md` |

---

### docs/requirements/ — 要件定義

| ファイル | 内容 | ステータス |
|---|---|---|
| `SSOT-0_PRD.md` | プロダクト要件定義書（PRD） | ✅ 作成済（README.md + 全既存資料から正式PRD形式へ変換） |
| `SSOT-1_FEATURE_CATALOG.md` | 機能カタログ（90機能・機能ID付き） | ✅ 作成済（標準カテゴリ12 + EVT 16 + VENUE 6） |

**元ネタとなる既存資料：**

| 既存ファイル | 内容 | 場所 |
|---|---|---|
| `persona-feature-mapping.md` | ペルソナ × MVP機能マッピング・スコープ判断 | `docs/persona-feature-mapping.md` |

---

### docs/design/ — 設計

#### docs/design/core/ — コア定義（原則変更不可）

| ファイル | 内容 | ステータス |
|---|---|---|
| `SSOT-2_UI_STATE.md` | UI/状態遷移定義（40+画面・5状態遷移・コンポーネント設計） | ✅ 作成済 |
| `SSOT-3_API_CONTRACT.md` | API規約（16カテゴリ・80+エンドポイント・エラー設計） | ✅ 作成済 |
| `SSOT-4_DATA_MODEL.md` | データモデル定義（20テーブル・RLS・ULID） | ✅ 作成済 |
| `SSOT-5_CROSS_CUTTING.md` | 横断的関心事（認証・マルチテナント・AI・エラー・ログ・テスト） | ✅ 作成済 |

#### docs/design/features/common/ — 共通機能仕様

| ファイル | 内容 | ステータス |
|---|---|---|
| `AUTH-001_login.md` | ログイン機能 | 📋 未作成 |
| `AUTH-005_logout.md` | ログアウト機能 | 📋 未作成 |
| `ACCT-001_signup.md` | サインアップ機能 | 📋 未作成 |

#### docs/design/features/project/ — 固有機能仕様

| ファイル | 内容 | ステータス |
|---|---|---|
| `EVT-001_event_planning_ai.md` | イベント企画・予約AIアシスト | 📋 未作成（README §5.1） |
| `EVT-002_master_schedule.md` | タスク・締め切り一元管理 | 📋 未作成（README §5.2） |
| `EVT-003_stakeholder_workflow.md` | ステークホルダー・ワークフロー管理 | 📋 未作成（README §5.3） |
| `EVT-004_participant_portal.md` | 参加者ポータル＋QR＋AI FAQ | 📋 未作成（README §5.4） |
| `EVT-005_post_report.md` | 事後レポート＆フォローアップ | 📋 未作成（README §5.5） |
| `AI-001_hub_concierge.md` | AIアシスタント（HUBコンシェルジュ） | 📋 未作成（README §6.2） |

#### docs/design/adr/ — 設計判断記録

| ファイル | 内容 | ステータス |
|---|---|---|
| `001_TECH_STACK.md` | 技術スタック選定（Nuxt 3 / Drizzle / PostgreSQL / Better Auth / Claude API / VPS） | ✅ 作成済 |
| `000_TEMPLATE.md` | ADRテンプレート | 📋 未作成 |

---

### docs/standards/ — 開発規約

| ファイル | 内容 | ステータス |
|---|---|---|
| `CODING_STANDARDS.md` | コーディング規約 | 📋 未作成 |
| `TESTING_STANDARDS.md` | テスト規約 | 📋 未作成 |
| `GIT_WORKFLOW.md` | Git運用ルール | 📋 未作成 |

---

### docs/operations/ — 運用

| ファイル | 内容 | ステータス |
|---|---|---|
| `DEPLOYMENT.md` | デプロイ手順 | 📋 未作成 |
| `MONITORING.md` | 監視・アラート | 📋 未作成 |
| `INCIDENT_RESPONSE.md` | インシデント対応 | 📋 未作成 |

---

### docs/marketing/ — マーケティング・JV提案

| ファイル | 内容 | ステータス |
|---|---|---|
| `LAUNCH_PLAN.md` | ローンチ計画 | 📋 未作成 |
| `LP_SPEC.md` | LP仕様 | 📋 未作成 |
| `PRICING_STRATEGY.md` | 料金戦略 | 📋 未作成 |

**元ネタとなる既存資料：**

| 既存ファイル | 内容 | 場所 |
|---|---|---|
| `jv-proposal-venue.md` | JV提案ストーリー（売上モデル・効率化・提案資料構成） | `docs/jv-proposal-venue.md` |

---

### docs/growth/ — グロース戦略

| ファイル | 内容 | ステータス |
|---|---|---|
| `GROWTH_STRATEGY.md` | グロース戦略 | 📋 未作成 |
| `METRICS_DEFINITION.md` | KPI・メトリクス定義 | 📋 未作成 |

---

### docs/management/ — プロジェクト管理

| ファイル | 内容 | ステータス |
|---|---|---|
| `PROJECT_PLAN.md` | プロジェクト計画 | 📋 未作成 |
| `RISKS.md` | リスク管理 | 📋 未作成 |
| `CHANGES.md` | 変更履歴 | 📋 未作成 |

---

### .claude/agents/ — Agent Teams

| ファイル | 役割 | ステータス |
|---|---|---|
| `visual-tester.md` | ビジュアルテスト専門エージェント | ✅ 作成済 |
| `code-reviewer.md` | Adversarial Review（Role B）エージェント | ✅ 作成済 |
| `ssot-explorer.md` | SSOT検索・要約エージェント | ✅ 作成済 |

---

## 既存資料 → フレームワーク構造 マッピング

| 既存資料 | フレームワーク上の位置づけ | 次Phase での変換先 |
|---|---|---|
| `README.md` | プロジェクト概要（SSOT の源流） | `docs/idea/IDEA_CANVAS.md` + `docs/requirements/SSOT-0_PRD.md` |
| `docs/persona-stories.md` | ユーザー体験ストーリー | `docs/idea/USER_PERSONA.md` |
| `docs/pain-points.md` | ペイン × 解消体験 | `docs/idea/VALUE_PROPOSITION.md` |
| `docs/persona-feature-mapping.md` | 機能スコープ判断 | `docs/requirements/SSOT-1_FEATURE_CATALOG.md` |
| `docs/jv-proposal-venue.md` | JV提案・営業戦略 | `docs/marketing/` 配下 |
