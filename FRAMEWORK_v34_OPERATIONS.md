# フレームワーク v3.4 運用開始手順 — haishin-plus-hub

> CLAUDE.md v3.4 は適用済み。このファイルは「フレームワークを実際に動かす」ための手順書です。
> 上から順に実行してください。完了後、このファイルは docs/ に移動するか削除してOKです。

---

## Step 1: framework retrofit（フレームワーク管理の有効化）

```bash
# haishin-plus-hub プロジェクトのルートで実行
framework retrofit

# 何が起きるか:
# - .framework/profile.json が生成される（プロジェクトタイプ: app）
# - 既存ドキュメント構造を分析してレポートを出力
# - framework status / plan / audit 等が使えるようになる
```

確認:
```bash
framework status
# → プロジェクトの現在の状態が表示されれば成功
```

---

## Step 2: 既存SSOTの品質監査

haishin-plus-hub の仕様書は `docs/design/features/` に配置されている:
- `common/` — 共通機能（認証・アカウント等）
- `project/` — 固有機能（イベント管理・AIアシスト等）

コア定義は `docs/design/core/` :
- SSOT-2_UI_STATE.md
- SSOT-3_API_CONTRACT.md
- SSOT-4_DATA_MODEL.md
- SSOT-5_CROSS_CUTTING.md

```bash
# SSOT品質監査
framework audit ssot

# 個別ファイルの監査
framework audit ssot docs/design/core/SSOT-3_API_CONTRACT.md
framework audit ssot docs/design/features/common/AUTH-001_login.md
```

### 監査で確認すべきポイント

v3.4 で必須になった項目:

| セクション | 内容 | 基準 |
|-----------|------|------|
| §3-E 入出力例 | 正常系+異常系の具体例 | 5ケース以上（正常2+異常3） |
| §3-F 境界値 | 全データ項目の境界パターン | 全フィールドに定義あり |
| §3-G 例外応答 | 全エラーケースの応答定義 | エラーケースと1:1対応 |
| §3-H Gherkin | 受入テストシナリオ | 全MUST要件にシナリオあり |

---

## Step 3: 不足セクションの補完

監査で不足が見つかった場合:

```
「AUTH-001_login.md の §3-E/F/G/H を補完して」
「SSOT-3_API_CONTRACT.md の §3-G 例外応答を補完して」
```

補完の優先順位:
1. core/ のコア定義 — 全機能の基盤。最優先
2. common/ の共通機能 — 認証・アカウント等
3. project/ の固有機能 — 実装前に順次補完

---

## Step 4: タスク分解・実装計画

```bash
# 機能カタログから実装計画を生成
framework plan

# 何が起きるか:
# - docs/design/features/ の全SSOTを分析
# - 依存関係 → Wave分類 → 実装順序を決定
# - GitHub Issues の作成候補を出力
```

---

## Step 5: 日常の開発フロー

以降、機能を実装するときは必ず Pre-Code Gate を通す:

```
1. Gate A 確認: docker-compose でDB起動、pnpm dev が動くか
2. Gate B 確認: タスク分解されているか（GitHub Issue あるか）
3. Gate C 確認: 対象SSOTの §3-E/F/G/H が埋まっているか
4. 全て ✅ → feature ブランチで実装開始
```

### スキルの活用

```
「合議して：イベント管理のマルチロール権限設計」
→ T4(Cross-Cutting) + T5(Security) + P3(UI State) が議論

「P4を実行」（Feature Spec Writer）
→ 新機能の仕様書を対話的に作成

「I3を実行」（Code Auditor）
→ 実装後のコード監査

「レビュー評議会を開催して」
→ フェーズ完了時の品質ゲートレビュー
```

---

## チェックリスト

- [ ] `framework retrofit` 実行済み
- [ ] `framework status` が動作する
- [ ] `framework audit ssot` で core/ と common/ を監査済み
- [ ] 優先機能の §3-E/F/G/H を補完済み
- [ ] `framework plan` で実装計画を生成済み
