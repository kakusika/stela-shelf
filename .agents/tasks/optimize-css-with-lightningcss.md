# Task: Optimize CSS Pipeline with Lightning CSS

## Context & Objectives
現在、`crates/stela-shelf-assets` では Rust の `concat!` マクロと `include_str!` を用いて 13 個の CSS ファイルを物理的に連結している。
これを Rust 製の高速 CSS 最適化ツール `lightningcss` を用いた本格的なバンドル＆AST最適化＆ミニファイパイプラインに刷新する。

### Objectives
1. **Rust ネイティブな CSS パイプライン**:
   - `build-dependencies` に `lightningcss` を追加し、外部 CLI や Node.js を使わずに Rust 内で完結。
2. **`@import` バンドル化**:
   - エントリーポイント `frontend/styles/shelf.css` に `@import` を記述し、`lib.rs` での `concat!` 物理結合を撤廃。
3. **AST レベルの最適化 & ミニファイ**:
   - 重複セレクタのマージ、カラー短縮、構文圧縮により、配信される CSS ファイルサイズを劇的に軽量化。
4. **Web Components 用 Shadow DOM スタイルの最適化**:
   - `components/*.css`（`tmt-btn.css` 等）も同様に Lightning CSS でミニファイ。

---

## Discrete Steps

- [x] 1. ワークスペースの作成と事前調査
  - `jj workspace add .agents/workspaces/optimize-css-with-lightningcss`
  - 現状の CSS サイズ（未圧縮・現状の `shelf.css`）の計測: 179,697 bytes (~176 KB)
- [x] 2. `crates/stela-shelf-assets` への `lightningcss` 導入
  - `Cargo.toml` の `build-dependencies` に `lightningcss`（features = ["bundler"]）を追加
  - エントリーポイント `frontend/styles/shelf.css`（`@import` 構成）の作成
  - `build.rs` に Lightning CSS によるバンドル・AST最適化・ミニファイ処理を実装
  - `40-hero.css` コメント内の `*/` による意図しないコメント終了バグを AST 検証により発見・修正
- [x] 3. `crates/stela-shelf-assets/src/lib.rs` のリファクタリング
  - 泥臭い `concat!` + 13 回の `include_str!` を `include_str!(concat!(env!("OUT_DIR"), "/shelf.min.css"))` に一本化
  - Web Components 用 Shadow DOM スタイルもミニファイ版を参照するように整理
- [x] 4. 最適化効果の測定と検証
  - ビルド前後の CSS ファイルサイズの比較:
    - 最適化前: 179,697 bytes (~176 KB)
    - 最適化後: 103,790 bytes (~101 KB)
    - **削減率: 42.2%（約 76 KB 削減）**
  - 全 5 バリアントでの SSG ビルド（`stela-shelf build`）の実行確認:
    - 全エンジンで同一ハッシュ `fd4dbd631021e55159ebd25362bd379b` を確認
  - `cargo test --workspace`: 全テスト PASS
  - `nix build .#stela-shelf`: PASS
  - `just docs-check`: PASS
- [x] 5. ワークスペースのクリーンアップとコミット確認
  - ワークスペース forget と削除完了
  - ユーザーへコミット内容の提示と確認待ち


