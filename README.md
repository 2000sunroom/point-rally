# スタンプラリー Webアプリ

スポーツクラブ向けのポイント消費型スタンプラリーWebアプリケーションです。

## 機能一覧

### 使用者（ユーザー）
- QRコードをカメラで読み取ってポイント獲得
- 現在のポイント数の確認
- ポイントの獲得・消費履歴の確認
- 景品一覧の表示（必要ポイント・プログレス表示）
- ポイントを消費して景品と交換

### 管理者
- QRコードの作成・表示・管理
- 全ユーザーのポイント保有状況の確認
- 景品の作成・編集・削除
- 全ユーザーのポイント付与・消費履歴の確認

### 不正防止機能
- **位置情報チェック**: QRコード作成時の管理者端末位置から100m以内でのみ読み取り可能
- **24時間制限**: 同一QRコードは24時間以内に1回のみ読み取り可能

## 技術スタック

- **バックエンド**: Node.js + Express
- **フロントエンド**: React + Vite + Tailwind CSS
- **データベース**: SQLite (ローカル: sql.js / 本番: Turso)
- **認証**: JWT
- **デプロイ**: Vercel

## サイト構成

| パス | 用途 |
|------|------|
| `/` | ユーザーサイト |
| `/admin` | 管理者サイト |

## ローカル開発

```bash
# 依存関係インストール
npm install
cd client && npm install && cd ..

# クライアントビルド
cd client && npx vite build && cd ..

# サーバー起動
node start.js
```

http://localhost:3001 でアクセスできます。

## Vercel + Turso でデプロイ

### 1. Turso でデータベースを作成

```bash
# Turso CLI インストール
# Windows: winget install Chiselstrike.Turso
# Mac: brew install tursodatabase/tap/turso

# ログイン
turso auth login

# データベース作成
turso db create stamp-rally

# データベースURLを取得
turso db show stamp-rally --url

# 認証トークンを取得
turso db tokens create stamp-rally
```

### 2. GitHub にプッシュ

```bash
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/あなたのユーザー名/stamp-rally.git
git push -u origin main
```

### 3. Vercel にデプロイ

1. [vercel.com](https://vercel.com) にログイン
2. 「Import Project」→ GitHub リポジトリを選択
3. 環境変数を設定:
   - `TURSO_DATABASE_URL` = Turso の URL
   - `TURSO_AUTH_TOKEN` = Turso のトークン
   - `JWT_SECRET` = 任意の秘密鍵文字列
4. 「Deploy」をクリック

### デフォルトアカウント

| 種別 | ユーザー名 | パスワード |
|------|-----------|-----------|
| 管理者 | admin | admin123 |

## 注意事項

- QRコード読み取りにはHTTPS環境が必要です（カメラ・位置情報API）
- Vercelデプロイ後は自動的にHTTPS化されます
- Chrome/Edge/Safari最新版での使用を推奨します
