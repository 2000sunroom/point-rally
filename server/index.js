/**
 * ローカル開発用サーバー
 * 本番環境(Vercel)では api/index.js がエントリポイント
 */
const path = require('path');
const fs = require('fs');
const app = require('./app');

const PORT = process.env.PORT || 3001;
const DIST_DIR = path.join(__dirname, '..', 'client', 'dist');

// 静的ファイル配信（ビルド済みクライアント）
if (fs.existsSync(DIST_DIR)) {
  app.use(require('express').static(DIST_DIR, { index: false }));

  // SPA フォールバック（全ページ同じindex.htmlを返す）
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`サーバー起動: http://localhost:${PORT}`);
  console.log(`  ユーザーサイト: http://localhost:${PORT}`);
  console.log(`  管理者サイト:   http://localhost:${PORT}/admin`);
});
