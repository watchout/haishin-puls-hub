---
name: "機能実装: API層"
about: "SSOTの§5+§7に基づくAPI実装タスク"
title: "[FEAT-XXX-API] [機能名] - API実装"
labels: ["feature", "api"]
---

## SSOT参照
- 📄 docs/design/features/[common|project]/FEAT-XXX_[name].md
- 📌 参照セクション: §5 API仕様, §7 ビジネスルール, §9 エラー定義

## 概要
<!-- SSOTの§5の要約を記載 -->

## 完了条件
- [ ] エンドポイント実装
- [ ] バリデーション（Zod スキーマ）
- [ ] ビジネスルール実装（§7準拠）
- [ ] エラーハンドリング（§9準拠）
- [ ] 認証・認可チェック
- [ ] コードレビュー通過

## ブランチ
`feature/FEAT-XXX-api`

## 依存
- Blocked by: FEAT-XXX-DB
- Blocks: FEAT-XXX-UI, FEAT-XXX-INT

## 推定
- Size: S / M / L
