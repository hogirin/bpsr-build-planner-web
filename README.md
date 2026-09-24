# BPSR Build Planner Web

`alalwww/bpsr-build-planner` を基に、ブラウザとGitHub Pagesだけで動く部分へ絞ったWeb専用版です。レスポンシブUIは元プロジェクトのv0.12.4までの変更を反映しています。

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

## Web版の構成方針

このWeb版は、静的ファイルだけを配信するGitHub Pagesで完結する構成です。

### 共有URL

元プロジェクトの短縮URLは、プランコードをPHPバックエンドへ保存し、短いIDとの対応を管理する仕組みです。GitHub Pagesにはサーバー処理やデータベースがないため、このWeb版ではバックエンドを必要としない `#plan=...` 形式の長い共有URLへ置き換えています。

プランデータはURLのフラグメント内に含まれ、Web版独自の保存サーバーへ送信されません。短縮URLを導入する場合は、Cloudflare Workers、Supabase、Firebase、独自サーバーなどを別途用意する必要があります。

### アクセス解析とプライバシーポリシー

Google Analyticsを含むアクセス解析は導入していません。元プロジェクトのプライバシーポリシー画面は、Google Analytics、localStorage、バックエンド短縮URLについて説明する内容のため、そのまま流用せず、このWeb版には含めていません。

ビルドの保存にはブラウザ内のlocalStorageを使用します。サーバー側へのビルド保存やユーザーアカウント機能はありません。

今後、外部のアクセス解析や保存サービスを追加する場合は、このWeb版の実際のデータ利用に合わせたプライバシーポリシーを別途用意します。

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
