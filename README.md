# BPSR Build Planner Web

`alalwww/bpsr-build-planner` v0.11.3 を基に、ブラウザとGitHub Pagesだけで動く部分へ絞ったWeb専用版です。

## 含む機能

- ビルドプランナー画面
- 装備・スキル・モジュール・潜在の設定
- HP・攻撃力などのステータス計算
- ブラウザのlocalStorageを使ったビルド保存
- `#plan=...` 形式の長い共有URLの作成と読込

## 含まない機能

- Tauriデスクトップアプリ
- 常駐・別ウィンドウ・自動更新機能
- パケットキャプチャ
- PHPバックエンドを使う短縮URL

## ローカル確認

ローカル環境ではNode.jsを使用しません。依存関係のインストール、テスト、WebビルドはGitHub Actions上だけで実行します。

## GitHub Pages

`main` ブランチへPushすると `.github/workflows/deploy-pages.yml` がテストとWebビルドを実行し、生成された `dist-web/` をGitHub Pagesへ公開します。

Project Pagesの公開URLは通常、次の形式です。

```text
https://<ユーザー名>.github.io/<リポジトリ名>/
```

## 出典とライセンス

元プロジェクト: https://github.com/alalwww/bpsr-build-planner

元プロジェクトのMIT LicenseとNOTICEを引き継いでいます。
