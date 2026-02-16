const express = require('express');
const { runQuery, getOne, getAll, getLastInsertId } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// お問い合わせ送信（ユーザー）
router.post('/', authenticate, async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ error: '件名と内容を入力してください' });
    }
    await runQuery(
      'INSERT INTO inquiries (user_id, subject, message) VALUES (?, ?, ?)',
      [req.user.id, subject, message]
    );
    res.json({ message: 'お問い合わせを送信しました' });
  } catch (err) {
    console.error('Inquiry create error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// お問い合わせ一覧（管理者）
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const inquiries = await getAll(
      `SELECT i.*, u.display_name as user_name, u.username
       FROM inquiries i
       JOIN users u ON i.user_id = u.id
       ORDER BY i.created_at DESC`
    );
    res.json({ inquiries });
  } catch (err) {
    console.error('Inquiry list error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// お問い合わせ既読（管理者）
router.patch('/:id/read', authenticate, requireAdmin, async (req, res) => {
  try {
    await runQuery('UPDATE inquiries SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: '既読にしました' });
  } catch (err) {
    console.error('Inquiry read error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// 未読件数（管理者）
router.get('/unread-count', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await getOne('SELECT COUNT(*) as count FROM inquiries WHERE is_read = 0');
    res.json({ count: result?.count || 0 });
  } catch (err) {
    console.error('Inquiry count error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

module.exports = router;
