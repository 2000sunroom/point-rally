const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { getDb, runQuery, getOne } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// DB初期化（1回だけ実行）
let dbReady = null;
function ensureDb() {
  if (!dbReady) {
    dbReady = (async () => {
      await getDb();
      const admin = await getOne("SELECT id FROM users WHERE role = 'admin'");
      if (!admin) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await runQuery(
          'INSERT INTO users (username, password, display_name, role) VALUES (?, ?, ?, ?)',
          ['admin', hashedPassword, '管理者', 'admin']
        );
        console.log('デフォルト管理者を作成しました (admin / admin123)');
      }
    })();
  }
  return dbReady;
}

// 全APIリクエストの前にDB初期化を保証
app.use('/api', async (req, res, next) => {
  try {
    await ensureDb();
    next();
  } catch (err) {
    console.error('DB init error:', err);
    res.status(500).json({ error: 'データベース初期化エラー' });
  }
});

// APIルート
app.use('/api/auth', require('./routes/auth'));
app.use('/api/qrcodes', require('./routes/qrcodes'));
app.use('/api/points', require('./routes/points'));
app.use('/api/prizes', require('./routes/prizes'));
app.use('/api/admin', require('./routes/admin'));

module.exports = app;
