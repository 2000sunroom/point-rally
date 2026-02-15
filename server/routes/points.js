const express = require('express');
const { runQuery, getOne, getAll } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// QRコード読み取り→ポイント付与
router.post('/scan', authenticate, async (req, res) => {
  try {
    const { qr_code, user_lat, user_lng } = req.body;
    const userId = req.user.id;
    if (!qr_code) return res.status(400).json({ error: 'QRコードデータが必要です' });
    if (user_lat === undefined || user_lng === undefined) {
      return res.status(400).json({ error: '位置情報が必要です' });
    }

    const qr = await getOne('SELECT * FROM qr_codes WHERE code = ? AND is_active = 1', [qr_code]);
    if (!qr) return res.status(404).json({ error: 'このQRコードは無効です' });

    const distance = calculateDistance(qr.admin_lat, qr.admin_lng, user_lat, user_lng);
    if (distance > 100) {
      return res.status(403).json({
        error: `読み取り位置が遠すぎます。施設から100m以内で読み取ってください（現在の距離: ${Math.round(distance)}m）`
      });
    }

    const recentScan = await getOne(
      `SELECT * FROM scan_log
       WHERE user_id = ? AND qr_code_id = ?
       AND datetime(scanned_at) > datetime('now','localtime','-24 hours')`,
      [userId, qr.id]
    );
    if (recentScan) {
      const scannedAt = new Date(recentScan.scanned_at);
      const nextAvailable = new Date(scannedAt.getTime() + 24 * 60 * 60 * 1000);
      return res.status(403).json({
        error: `このQRコードは24時間以内に読み取り済みです。次回読み取り可能: ${nextAvailable.toLocaleString('ja-JP')}`
      });
    }

    await runQuery('UPDATE users SET points = points + ? WHERE id = ?', [qr.points, userId]);
    await runQuery('INSERT INTO scan_log (user_id, qr_code_id) VALUES (?, ?)', [userId, qr.id]);
    await runQuery(
      'INSERT INTO point_history (user_id, points, type, description, qr_code_id) VALUES (?, ?, ?, ?, ?)',
      [userId, qr.points, 'earn', `QRコード「${qr.label}」で獲得`, qr.id]
    );

    const updatedUser = await getOne('SELECT id, username, display_name, role, points FROM users WHERE id = ?', [userId]);
    res.json({
      message: `${qr.points}ポイントを獲得しました！`,
      points_earned: qr.points,
      total_points: updatedUser.points,
      user: updatedUser
    });
  } catch (err) {
    console.error('Scan error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// ポイント履歴取得
router.get('/history', authenticate, async (req, res) => {
  try {
    const history = await getAll(
      `SELECT ph.*,
              CASE WHEN ph.qr_code_id IS NOT NULL THEN qr.label ELSE NULL END as qr_label,
              CASE WHEN ph.prize_id IS NOT NULL THEN p.name ELSE NULL END as prize_name
       FROM point_history ph
       LEFT JOIN qr_codes qr ON ph.qr_code_id = qr.id
       LEFT JOIN prizes p ON ph.prize_id = p.id
       WHERE ph.user_id = ?
       ORDER BY ph.created_at DESC`,
      [req.user.id]
    );
    res.json({ history });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// 景品と交換
router.post('/redeem/:prizeId', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const prizeId = req.params.prizeId;

    const prize = await getOne('SELECT * FROM prizes WHERE id = ? AND is_active = 1', [prizeId]);
    if (!prize) return res.status(404).json({ error: '景品が見つかりません' });
    if (prize.stock <= 0) return res.status(400).json({ error: 'この景品は在庫がありません' });

    const user = await getOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (user.points < prize.points_required) {
      return res.status(400).json({ error: `ポイントが不足しています。必要: ${prize.points_required}pt、現在: ${user.points}pt` });
    }

    await runQuery('UPDATE users SET points = points - ? WHERE id = ?', [prize.points_required, userId]);
    await runQuery('UPDATE prizes SET stock = stock - 1 WHERE id = ?', [prizeId]);
    await runQuery(
      'INSERT INTO point_history (user_id, points, type, description, prize_id) VALUES (?, ?, ?, ?, ?)',
      [userId, -prize.points_required, 'spend', `景品「${prize.name}」と交換`, prizeId]
    );

    const updatedUser = await getOne('SELECT id, username, display_name, role, points FROM users WHERE id = ?', [userId]);
    res.json({
      message: `「${prize.name}」と交換しました！`,
      points_spent: prize.points_required,
      total_points: updatedUser.points,
      user: updatedUser
    });
  } catch (err) {
    console.error('Redeem error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

module.exports = router;
