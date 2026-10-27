# Task: Switch to `lightningcss` CLI & Unify on Tailwind CSS v4

## Context & Objectives
`crates/stela-shelf-assets` のビルドパイプラインにおいて、`[build-dependencies]` の `lightningcss` Rust クレートを廃止し、`esbuild` / `tailwindcss` と対称な Nix 提供の `lightningcss` CLI 呼び出しへ移行する。あわせて、`dev.nix`（v4）と `pkgs/stela-shelf.nix`（v3）の間で食い違っていた Tailwind CSS を v4 の CSS-first 設定に統一し、`shelf.css` を真の Single Source of Truth に整理する。

## Discrete Steps

- [x] 1. Nix 環境とパッケージ定義の更新 (`nix/dev.nix`, `nix/pkgs/stela-shelf.nix`, `nix/pkgs/stela-shelf-embedded-search.nix`)
  - `lightningcss` CLI を追加し、`tailwindcss` を `tailwindcss_4` に統一
- [x] 2. Tailwind CSS v4 CSS-first 化と `shelf.css` の Single Source of Truth 化
  - `tailwind-input.css` に `@theme` / `@custom-variant` / `@source` を集約
  - 不要になる `tailwind.config.ts` と `tsconfig.json` / `globals.d.ts` の型シムを削除
  - `shelf.css` に `@import "./tailwind.generated.css";` を含め、`build.rs` 側の `@import` 二重管理を解消
- [x] 3. `Cargo.toml` からの `lightningcss` クレート削除と `build.rs` の CLI 化
  - ワークスペースおよび `stela-shelf-assets` の `Cargo.toml` から `lightningcss` クレートを除去
  - `build.rs` で `OUT_DIR/styles` にスタイル群をステージングし、`lightningcss` CLI（Baseline ターゲット指定）で `shelf.min.css` と `components/*.css` を一括最適化
- [x] 4. ビルド・テスト・Nix パッケージ検証
  - `just check`, `just test`, `just clippy`: 全通過
  - `Cargo.lock`: `lightningcss` クレートおよび関連依存の削除により 420 行削減
  - 生成 CSS (`shelf.min.css`): Tailwind v4 のカスタムカラートークン（`.bg-surface`, `.border-shell-border` 等）・`!important` モディファイア（`.no-underline\!`）の出力、および `.container` 非衝突を確認
  - `nix fmt`, `just docs-check`, `nix build`: サンドボックスビルド含め全通過
