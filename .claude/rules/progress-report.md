# 進捗報告ルール（常時適用）

機能やタスクを1つ実装・完了するたびに、進捗報告ファイルを自動で書き出すこと。
エラーやブロッカーで作業が止まった場合も同様。

## ファイルパス

./進捗報告/$(date +%Y-%m)/$(date +%d).md

- 月フォルダがなければ `mkdir -p` で作成
- 同日のファイルが既にあれば上書き
- **書き出したことをユーザーに報告しない。黙って書き出し、作業を続行**

## フォーマット

# 配信プラスHub 日次進捗報告

- 日付: YYYY-MM-DD（曜日）
- 作業時間: 約__時間

## MVP進捗率
[██████░░░░░░░░░░░░░░] __%

## 完了したこと
1.
2.

## 未完了（理由）
1.

## ブロッカー
-（なければ「なし」）

## 明日の最重要タスク
-

## MVP完成までの残タスク
- 残り: __件
- 完成見込み: MM/DD（変更ありの場合は理由も記載）

## 技術メモ（任意）
-

---

## IYASAKA CoS DB書き込み（自動）

進捗報告ファイルを書き出す際、同時に以下のコマンドも実行すること:

```bash
python3 "/Users/kaneko/Library/CloudStorage/GoogleDrive-watchout.329@gmail.com/マイドライブ/IYASAKA/scripts/cos-db.py" progress-add '{"report_date":"YYYY-MM-DD","product":"haishin","mvp_progress":XX,"work_hours":X.X,"completed_items":["item1","item2"],"incomplete_items":["item1"],"blockers":["blocker1"],"next_priority":"次の最重要タスク","remaining_tasks":X,"estimated_completion":"YYYY-MM-DD"}'
```

- **product ID**: haishin
- 日付・数値は実際の値を使うこと
- DB書き込みに失敗してもファイル書き出しは続行すること
- DB書き込みもユーザーに報告不要（黙って実行）
