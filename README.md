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

この作業環境ではNode.jsを使用していないため、依存関係のインストールや実ビルドは未実施です。
Node.jsを使わずにソースをそのままブラウザで実行することはできません。ビルドは将来リポジトリへPushした際にGitHub Actions上で行う想定です。

## GitHub Pages

GitHub Pagesへ配置するのは、Webビルドで生成される `dist-web/` の内容です。
このローカル版には、Node.jsを前提にした自動ビルドワークフローをまだ含めていません。
ビルド方法と公開先リポジトリを決めた段階で、Pages用ワークフローを追加します。

Project Pagesの公開URLは通常、次の形式です。

```text
https://<ユーザー名>.github.io/<リポジトリ名>/
```

## 出典とライセンス

元プロジェクト: https://github.com/alalwww/bpsr-build-planner

元プロジェクトのMIT LicenseとNOTICEを引き継いでいます。
