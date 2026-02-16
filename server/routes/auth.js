const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { runQuery, getOne } = require('../db');
const { JWT_SECRET, authenticate } = require('../middleware/auth');

const router = express.Router();

// ユーザー登録
router.post('/register', async (req, res) => {
  try {
    const { username, password, display_name } = req.body;
    if (!username || !password || !display_name) {
      return res.status(400).json({ error: 'すべてのフィールドを入力してください' });
    }
    const existing = await getOne('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(400).json({ error: 'このユーザー名は既に使用されています' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await runQuery(
      'INSERT INTO users (username, password, display_name, role) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, display_name, 'user']
    );
    const user = await getOne('SELECT id, username, display_name, role, points FROM users WHERE username = ?', [username]);
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// ログイン
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'ユーザー名とパスワードを入力してください' });
    }
    const user = await getOne('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: 'ユーザー名またはパスワードが正しくありません' });
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'ユーザー名またはパスワードが正しくありません' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role, points: user.points }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// 自分の情報取得
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await getOne(
      'SELECT id, username, display_name, role, points, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: 'ユーザーが見つかりません' });
    res.json({ user });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// パスワード変更
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: '現在のパスワードと新しいパスワードを入力してください' });
    }
    if (new_password.length < 4) {
      return res.status(400).json({ error: '新しいパスワードは4文字以上にしてください' });
    }
    const user = await getOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(current_password, user.password);
    if (!valid) {
      return res.status(401).json({ error: '現在のパスワードが正しくありません' });
    }
    const hashed = await bcrypt.hash(new_password, 10);
    await runQuery('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ message: 'パスワードを変更しました' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

module.exports = router;
