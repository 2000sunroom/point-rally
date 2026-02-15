const express = require('express');
const { runQuery, getOne, getAll, getLastInsertId } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const prizes = await getAll('SELECT * FROM prizes WHERE is_active = 1 ORDER BY points_required ASC');
    res.json({ prizes });
  } catch (err) {
    console.error('Prizes list error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, description, points_required, stock, image_url } = req.body;
    if (!name || !points_required || points_required <= 0) {
      return res.status(400).json({ error: '景品名と有効なポイント数を入力してください' });
    }
    await runQuery(
      'INSERT INTO prizes (name, description, points_required, stock, image_url) VALUES (?, ?, ?, ?, ?)',
      [name, description || '', points_required, stock || 0, image_url || '']
    );
    const id = await getLastInsertId();
    const prize = await getOne('SELECT * FROM prizes WHERE id = ?', [id]);
    res.json({ prize });
  } catch (err) {
    console.error('Prize create error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, description, points_required, stock, image_url, is_active } = req.body;
    const existing = await getOne('SELECT * FROM prizes WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: '景品が見つかりません' });

    await runQuery(
      `UPDATE prizes SET name = ?, description = ?, points_required = ?, stock = ?, image_url = ?, is_active = ? WHERE id = ?`,
      [
        name || existing.name,
        description !== undefined ? description : existing.description,
        points_required || existing.points_required,
        stock !== undefined ? stock : existing.stock,
        image_url !== undefined ? image_url : existing.image_url,
        is_active !== undefined ? is_active : existing.is_active,
        req.params.id
      ]
    );
    const updated = await getOne('SELECT * FROM prizes WHERE id = ?', [req.params.id]);
    res.json({ prize: updated });
  } catch (err) {
    console.error('Prize update error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const existing = await getOne('SELECT * FROM prizes WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: '景品が見つかりません' });
    await runQuery('UPDATE prizes SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: '景品を削除しました' });
  } catch (err) {
    console.error('Prize delete error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

router.get('/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const prizes = await getAll('SELECT * FROM prizes ORDER BY created_at DESC');
    res.json({ prizes });
  } catch (err) {
    console.error('All prizes error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

module.exports = router;
