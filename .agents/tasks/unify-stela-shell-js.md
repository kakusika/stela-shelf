# Task: Unify Stela Shell JavaScript across All Engine Variants

## Context & Objectives
現在、テーマ切替（dark/light/system）、シェルコントラスト切替（high-contrast）、付箋ヘッダー（Sticky Tabs）の操作、キーボードショートカットなどのクライアント動作ロジックが `crates/stela-shelf-webcomponents` の TypeScript に閉じ込められている。
その結果、`htmx`, `solid`, `svelte`, `leptos` の各エンジンバリアントでは見た目（CSS）は統一されたものの、テーマ切替や付箋ヘッダーの操作等の振る舞いが動作しない非対称性が生じている。

本タスクでは、Stela シェルとしての共通クライアントスクリプトを `crates/stela-shelf-assets` に集約し、`esbuild` でミニファイした `stela-shell.min.js` を全 5 エンジンに共通配信する。

### Objectives
1. **Stela コア JS の集約**:
   - `crates/stela-shelf-assets/frontend/scripts/stela-shell.ts` を作成。
   - テーマ制御（dark / light / system / auto、ローカルストレージ同期）。
   - シェルコントラスト制御（normal / high）。
   - 付箋ヘッダー（Sticky Tabs）のアクティブ切り替え・スクロール連動・モバイルペイントグル。
   - 基本キーボードショートカット（テーマ切替 `t`、検索フォーカス `/`、閉じる `Escape`）。
2. **`stela-shelf-assets` のビルドパイプライン拡張**:
   - `crates/stela-shelf-assets/build.rs` に `esbuild` による `stela-shell.ts` ➔ `stela-shell.min.js` コンパイル処理を追加。
   - `stela_static_assets()` に `stela-shell.min.js` を追加。
3. **全エンジン（5バリアント）への統合**:
   - `htmx`, `solid`, `svelte`, `leptos` のベース HTML テンプレート（または SSR レイアウト）に `<script src="stela-shell.min.js">` を導入。
   - `webcomponents` との整合性確認（重複実行の防止・役割分担の整理）。
4. **検証**:
   - `cargo test --workspace`
   - 全 5 エンジンの SSG ビルド（`stela-shelf build`）
   - `nix build .#stela-shelf`
   - `just docs-check`

---

## Discrete Steps

- [x] 1. ワークスペースの作成と既存スクリプトの分析
  - `jj workspace add .agents/workspaces/unify-stela-shell-js` 完了
  - `10-theme.ts`（テーマ・岩石シェルコントラスト）、`40-book-view.ts`（付箋ヘッダー・ペイン制御）、`50-keyboard.ts` の仕様分析完了
- [x] 2. `crates/stela-shelf-assets` への Stela コア JS 実装
  - `crates/stela-shelf-assets/frontend/scripts/stela-shell.ts` の作成（テーマ、付箋ヘッダー、ペイン開閉、ショートカット）
  - `crates/stela-shelf-assets/build.rs` に `esbuild` によるバンドル・ミニファイ処理を追加（生成物: 4.8 KB）
  - `crates/stela-shelf-assets/src/lib.rs` で `STELA_SHELL_JS`, `STELA_SHELL_JS_VERSION` を定義し `stela_static_assets()` に `stela-shell.js` を追加
- [x] 3. 全エンジンのテンプレートへのスクリプト適用
  - `htmx`: `base.html` / `lib.rs` で `stela_static_assets` と `stela-shell.js` を読み込み
  - `solid`: `base.html` / `lib.rs` で `stela_static_assets` と `stela-shell.js` を読み込み
  - `svelte`: `base.html` / `lib.rs` で `stela_static_assets` と `stela-shell.js` を読み込み
  - `leptos`: `components/layout.rs` / `lib.rs` で `stela_static_assets` と `stela-shell.js` を読み込み
  - `webcomponents`: `lib.rs` の static_assets を `stela_static_assets()` に統一
- [x] 4. 全体验証
  - `cargo test --workspace`: 全テスト PASS
  - 全 5 エンジンでの SSG ビルド確認: 全エンジンで同一ハッシュ `b1e635b538531068b90a99ea9a917271`（4.8 KB）の `stela-shell.js` 出力を確認
  - `nix build .#stela-shelf`: PASS
  - `just docs-check`: PASS
- [x] 5. ワークスペースのクリーンアップとコミット確認
  - ワークスペース forget と削除完了
  - ユーザーへコミット内容の提示と確認待ち

