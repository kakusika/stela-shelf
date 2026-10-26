# Task: Setup Search Islands Build & Drift Check in Justfile

## Context & Objectives
現在、`crates/stela-shelf-solid` および `crates/stela-shelf-svelte` の検索 Island スクリプト（`island.js`）は、Deno 経由でビルドされた生成物が Git にコミットされている。
Nix ビルドの完全サンドボックス（ネットワーク遮断）を壊さないため、生成物のコミット方式を維持しつつ、TSX/Svelte テンプレートの編集後に再ビルドを忘れてコードと生成物が乖離（ドリフト）するのを 100% 防止する仕組みを導入する。

### Objectives
1. **`just islands` レシピの導入**:
   - `crates/stela-shelf-solid/build-island.ts` と `crates/stela-shelf-svelte/build-island.ts` を一括実行する。
2. **`just islands-check` レシピの導入**:
   - 再ビルド後に `git diff --exit-code` で `assets/island.js` および `assets/island.css` に差分がないかを検査。
   - 変更があったのに再ビルドされていない場合、CI やローカルチェックでエラーを報告。
3. **`ci` レシピへの統合**:
   - `just ci` の依存タスクに `islands-check` を追加。
4. **検証**:
   - `just islands` の実行確認
   - `just islands-check` の実行確認
   - `just ci` の実行確認
   - `just docs-check`

---

## Discrete Steps

- [x] 1. ワークスペースの作成と事前確認
  - `jj workspace add .agents/workspaces/setup-islands-drift-check`
  - Deno 環境の確認（Deno 2.9.7）および `--node-modules-dir=auto` による解決バグ（`solid-js/web`）の修正
- [x] 2. `justfile` の更新
  - `islands` レシピの追加
  - `islands-check` レシピの追加
  - `ci` レシピへの統合
- [x] 3. 動作検証
  - `just islands` 実行確認
  - `just islands-check` 実行確認（生成物と完全一致 PASS）
  - `cargo test --workspace`: PASS
  - `just docs-check`: PASS
- [x] 4. ワークスペースのクリーンアップとコミット確認
  - ワークスペース forget と削除完了
  - ユーザーへコミット内容の提示と確認待ち

