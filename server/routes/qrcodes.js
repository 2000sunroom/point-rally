const express = require('express');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { runQuery, getOne, getAll, getLastInsertId } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// QRコード作成（管理者のみ）
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { label, points, admin_lat, admin_lng } = req.body;
    if (!points || points <= 0) {
      return res.status(400).json({ error: '有効なポイント数を入力してください' });
    }
    if (admin_lat === undefined || admin_lng === undefined) {
      return res.status(400).json({ error: '位置情報が必要です' });
    }
    const code = uuidv4();
    await runQuery(
      'INSERT INTO qr_codes (code, label, points, admin_id, admin_lat, admin_lng) VALUES (?, ?, ?, ?, ?, ?)',
      [code, label || `QR-${points}pt`, points, req.user.id, admin_lat, admin_lng]
    );
    const id = await getLastInsertId();
    const qrCode = await getOne('SELECT * FROM qr_codes WHERE id = ?', [id]);
    const qrDataUrl = await QRCode.toDataURL(code, { width: 300, margin: 2 });
    res.json({ qrCode, qrImage: qrDataUrl });
  } catch (err) {
    console.error('QR create error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// QRコード一覧（管理者のみ）
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const qrCodes = await getAll(
      `SELECT qr.*, u.display_name as admin_name
       FROM qr_codes qr JOIN users u ON qr.admin_id = u.id
       ORDER BY qr.created_at DESC`
    );
    const qrCodesWithImages = await Promise.all(
      qrCodes.map(async (qr) => {
        const qrImage = await QRCode.toDataURL(qr.code, { width: 300, margin: 2 });
        return { ...qr, qrImage };
      })
    );
    res.json({ qrCodes: qrCodesWithImages });
  } catch (err) {
    console.error('QR list error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// QRコード有効/無効切り替え
router.patch('/:id/toggle', authenticate, requireAdmin, async (req, res) => {
  try {
    const qr = await getOne('SELECT * FROM qr_codes WHERE id = ?', [req.params.id]);
    if (!qr) return res.status(404).json({ error: 'QRコードが見つかりません' });
    await runQuery('UPDATE qr_codes SET is_active = ? WHERE id = ?', [qr.is_active ? 0 : 1, req.params.id]);
    const updated = await getOne('SELECT * FROM qr_codes WHERE id = ?', [req.params.id]);
    res.json({ qrCode: updated });
  } catch (err) {
    console.error('QR toggle error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// QRコード位置情報更新
router.patch('/:id/location', authenticate, requireAdmin, async (req, res) => {
  try {
    const { admin_lat, admin_lng } = req.body;
    const qr = await getOne('SELECT * FROM qr_codes WHERE id = ?', [req.params.id]);
    if (!qr) return res.status(404).json({ error: 'QRコードが見つかりません' });
    await runQuery('UPDATE qr_codes SET admin_lat = ?, admin_lng = ? WHERE id = ?', [admin_lat, admin_lng, req.params.id]);
    const updated = await getOne('SELECT * FROM qr_codes WHERE id = ?', [req.params.id]);
    res.json({ qrCode: updated });
  } catch (err) {
    console.error('QR location update error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// QRコード削除
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const qr = await getOne('SELECT * FROM qr_codes WHERE id = ?', [req.params.id]);
    if (!qr) return res.status(404).json({ error: 'QRコードが見つかりません' });
    await runQuery('DELETE FROM qr_codes WHERE id = ?', [req.params.id]);
    res.json({ message: 'QRコードを削除しました' });
  } catch (err) {
    console.error('QR delete error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

module.exports = router;
