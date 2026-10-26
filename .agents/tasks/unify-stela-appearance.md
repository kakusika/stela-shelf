# Task: Unify Stela Appearance Across All Engine Variants

## Context & Objectives
全エンジンバリアント（`webcomponents`, `htmx`, `solid`, `svelte`, `leptos`）で外見（CSS、HTMLレイアウト）を統一する。
各バリアントはあくまでロジック（JS/Rust/HTMX/Islands）の差異であり、UIは「Stela の見た目」という単一のデザインシステムに準拠する。

### Stela デザインシステム原則
1. **岩石シェル（Stone / Rock Shell）**: 外枠・背景が岩のような有機的質感を持つこと（テクスチャ・カラー・サーフェス）。
2. **ボーダーレス（Border-less by default & Depth via Shadows）**: 硬い枠線は原則排し、明度差と影（Elevation）で階層と深さを表現する。枠線はコントラストオプション（High Contrast モード）時のみ表示。
3. **付箋ヘッダー（Sticky Tabs Header）**: H1〜H3 のセクション見出しが付箋のように重なって並ぶ象徴的UI。

---

## Discrete Steps

- [x] 1. ワークスペースの作成と現状資産の棚卸し
  - `jj workspace add .agents/workspaces/unify-stela-appearance`
  - 各バリアントの CSS / テンプレートの現状差分と依存関係の確認
- [x] 2. 共通アセット・テンプレート用クレート `stela-shelf-assets` の新設
  - `crates/stela-shelf-assets` の作成
  - CSS パイプライン（Tailwind / Stela CSS 群）を集約
  - 共通 Askama テンプレート（岩石シェル、3ペイン、付箋ヘッダー、共通マクロ）の配置
  - 静的アセット配信ヘルパー（`StaticAsset`, `STELA_CSS`, `COMPONENT_ASSETS` 等）の提供
- [x] 3. Stela CSS の原則純化とリファクタリング
  - デフォルトの硬いボーダーを影（Elevation）に移行
  - `[data-shell-contrast="high"]` 時のハイコントラストボーダー定義
  - 岩石テクスチャ・パレット（slate, marble, seigaiha, cloud, flourish, mesh）の整理
  - 付箋ヘッダー（`30-sticky-tabs.css`）の統合
- [x] 4. 各エンジンバリアントの共通アセットへの統合
  - `stela-shelf-webcomponents`: 重複アセットを `stela-shelf-assets` に移譲
  - `stela-shelf-htmx`: ミニマム CSS を廃止し、共通 Stela レイアウト＆CSS に移行
  - `stela-shelf-solid`: 共通 Stela レイアウト＆CSS に移行
  - `stela-shelf-svelte`: 共通 Stela レイアウト＆CSS に移行
  - `stela-shelf-leptos`: 共通 Stela CSS とクラス構造（岩石シェル・影・付箋）を同期
- [x] 5. ビルド・テスト・検証
  - `nix/pkgs/stela-shelf.nix` の fileset 更新
  - `cargo test --workspace` の実行
  - 全 5 バリアントでの SSG ビルド実行確認
  - `nix build .#stela-shelf` の実行確認
  - `just docs-check` の実行確認
- [x] 6. ワークスペースのクリーンアップとコミット確認
  - `jj workspace forget` とワークスペース削除
  - コミット内容の提示とユーザー確認
