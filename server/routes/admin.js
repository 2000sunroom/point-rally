const express = require('express');
const { getOne, getAll } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await getAll('SELECT id, username, display_name, role, points, created_at FROM users ORDER BY points DESC');
    res.json({ users });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

router.get('/history', authenticate, requireAdmin, async (req, res) => {
  try {
    const history = await getAll(
      `SELECT ph.*, u.display_name as user_name, u.username,
              CASE WHEN ph.qr_code_id IS NOT NULL THEN qr.label ELSE NULL END as qr_label,
              CASE WHEN ph.prize_id IS NOT NULL THEN p.name ELSE NULL END as prize_name
       FROM point_history ph
       JOIN users u ON ph.user_id = u.id
       LEFT JOIN qr_codes qr ON ph.qr_code_id = qr.id
       LEFT JOIN prizes p ON ph.prize_id = p.id
       ORDER BY ph.created_at DESC LIMIT 200`
    );
    res.json({ history });
  } catch (err) {
    console.error('Admin history error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

router.get('/users/:userId/history', authenticate, requireAdmin, async (req, res) => {
  try {
    const history = await getAll(
      `SELECT ph.*,
              CASE WHEN ph.qr_code_id IS NOT NULL THEN qr.label ELSE NULL END as qr_label,
              CASE WHEN ph.prize_id IS NOT NULL THEN p.name ELSE NULL END as prize_name
       FROM point_history ph
       LEFT JOIN qr_codes qr ON ph.qr_code_id = qr.id
       LEFT JOIN prizes p ON ph.prize_id = p.id
       WHERE ph.user_id = ? ORDER BY ph.created_at DESC`,
      [req.params.userId]
    );
    res.json({ history });
  } catch (err) {
    console.error('Admin user history error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await getOne('SELECT COUNT(*) as count FROM users WHERE role = ?', ['user']);
    const totalPoints = await getOne('SELECT SUM(points) as total FROM users WHERE role = ?', ['user']);
    const totalEarned = await getOne("SELECT SUM(points) as total FROM point_history WHERE type = 'earn'");
    const totalSpent = await getOne("SELECT ABS(SUM(points)) as total FROM point_history WHERE type = 'spend'");
    const activeQRCodes = await getOne('SELECT COUNT(*) as count FROM qr_codes WHERE is_active = 1');
    const activePrizes = await getOne('SELECT COUNT(*) as count FROM prizes WHERE is_active = 1');
    res.json({
      stats: {
        totalUsers: totalUsers?.count || 0,
        totalPointsHeld: totalPoints?.total || 0,
        totalPointsEarned: totalEarned?.total || 0,
        totalPointsSpent: totalSpent?.total || 0,
        activeQRCodes: activeQRCodes?.count || 0,
        activePrizes: activePrizes?.count || 0
      }
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

module.exports = router;
