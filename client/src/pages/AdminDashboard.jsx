import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';

function StatsCard({ label, value, color }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
    purple: 'from-purple-500 to-purple-600',
    pink: 'from-pink-500 to-pink-600',
    indigo: 'from-indigo-500 to-indigo-600',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color] || colors.blue} rounded-xl p-4 text-white shadow-md`}>
      <p className="text-white/70 text-xs">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function AdminStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getStats().then(d => setStats(d.stats)).catch(console.error);
  }, []);

  if (!stats) return <div className="animate-pulse h-32 bg-gray-200 rounded-xl"></div>;

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatsCard label="ユーザー数" value={stats.totalUsers} color="blue" />
      <StatsCard label="保有ポイント合計" value={`${stats.totalPointsHeld}pt`} color="green" />
      <StatsCard label="累計獲得ポイント" value={`${stats.totalPointsEarned || 0}pt`} color="orange" />
      <StatsCard label="累計消費ポイント" value={`${stats.totalPointsSpent || 0}pt`} color="purple" />
      <StatsCard label="有効QRコード" value={stats.activeQRCodes} color="indigo" />
      <StatsCard label="有効景品" value={stats.activePrizes} color="pink" />
    </div>
  );
}

function QRZoomModal({ qr, onClose }) {
  if (!qr) return null;
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-bold text-lg text-gray-800">{qr.label}</h3>
            <p className="text-blue-600 font-bold">{qr.points}pt</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex justify-center">
          <img
            src={qr.qrImage}
            alt={`QRコード: ${qr.label}`}
            className="w-full max-w-[280px] h-auto rounded-xl border border-gray-200"
          />
        </div>
        <div className="mt-4 text-center">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${qr.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {qr.is_active ? '有効' : '無効'}
          </span>
          <p className="text-xs text-gray-400 mt-2">作成: {new Date(qr.created_at).toLocaleString('ja-JP')}</p>
        </div>
      </div>
    </div>
  );
}

function QRManagement() {
  const [qrCodes, setQrCodes] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [zoomedQR, setZoomedQR] = useState(null);
  const [label, setLabel] = useState('');
  const [points, setPoints] = useState('');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    loadQRCodes();
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setMessage({ type: 'error', text: '位置情報を取得できません: ' + err.message }),
      { enableHighAccuracy: true }
    );
  };

  const loadQRCodes = async () => {
    try {
      const data = await api.getQRCodes();
      setQrCodes(data.qrCodes);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!location) {
      setMessage({ type: 'error', text: '位置情報が取得できていません。位置情報を許可してください。' });
      return;
    }
    setLoading(true);
    try {
      await api.createQRCode({
        label: label || `QR-${points}pt`,
        points: parseInt(points),
        admin_lat: location.lat,
        admin_lng: location.lng
      });
      setMessage({ type: 'success', text: 'QRコードを作成しました' });
      setLabel('');
      setPoints('');
      setShowCreate(false);
      loadQRCodes();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      await api.toggleQRCode(id);
      loadQRCodes();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleUpdateLocation = async (id) => {
    if (!location) {
      setMessage({ type: 'error', text: '位置情報が取得できていません' });
      return;
    }
    try {
      await api.updateQRLocation(id, location.lat, location.lng);
      setMessage({ type: 'success', text: '位置情報を更新しました' });
      loadQRCodes();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('このQRコードを削除しますか？')) return;
    try {
      await api.deleteQRCode(id);
      loadQRCodes();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-4">
      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="float-right font-bold">×</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {location ? `📍 位置情報取得済み` : '⏳ 位置情報取得中...'}
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          + 新規作成
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ラベル</label>
            <input type="text" value={label} onChange={e => setLabel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="例: 受付チェックイン"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ポイント数 *</label>
            <input type="number" value={points} onChange={e => setPoints(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="10" required min="1"
            />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? '作成中...' : 'QRコードを作成'}
          </button>
        </form>
      )}

      {qrCodes.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">QRコードがまだありません</p>
      ) : (
        <div className="space-y-3">
          {qrCodes.map(qr => (
            <div key={qr.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-4">
                <img
                  src={qr.qrImage}
                  alt="QR"
                  className="w-24 h-24 rounded-lg border cursor-pointer hover:opacity-80 hover:shadow-md transition-all active:scale-95"
                  title="クリックで拡大表示"
                  onClick={() => setZoomedQR(qr)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-800 truncate">{qr.label}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${qr.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {qr.is_active ? '有効' : '無効'}
                    </span>
                  </div>
                  <p className="text-blue-600 font-bold mt-1">{qr.points}pt</p>
                  <p className="text-xs text-gray-400 mt-1">作成: {new Date(qr.created_at).toLocaleString('ja-JP')}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <button onClick={() => handleToggle(qr.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium ${qr.is_active ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                      {qr.is_active ? '無効化' : '有効化'}
                    </button>
                    <button onClick={() => handleUpdateLocation(qr.id)}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200">
                      位置更新
                    </button>
                    <button onClick={() => handleDelete(qr.id)}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200">
                      削除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QRコード拡大モーダル */}
      <QRZoomModal qr={zoomedQR} onClose={() => setZoomedQR(null)} />
    </div>
  );
}

function PrizeManagement() {
  const [prizes, setPrizes] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', points_required: '', stock: '' });
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadPrizes(); }, []);

  const loadPrizes = async () => {
    try {
      const data = await api.getAllPrizes();
      setPrizes(data.prizes);
    } catch (err) { console.error(err); }
  };

  const resetForm = () => {
    setForm({ name: '', description: '', points_required: '', stock: '' });
    setShowCreate(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        name: form.name,
        description: form.description,
        points_required: parseInt(form.points_required),
        stock: parseInt(form.stock) || 0
      };
      if (editingId) {
        await api.updatePrize(editingId, data);
        setMessage({ type: 'success', text: '景品を更新しました' });
      } else {
        await api.createPrize(data);
        setMessage({ type: 'success', text: '景品を作成しました' });
      }
      resetForm();
      loadPrizes();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (prize) => {
    setForm({
      name: prize.name,
      description: prize.description || '',
      points_required: String(prize.points_required),
      stock: String(prize.stock)
    });
    setEditingId(prize.id);
    setShowCreate(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('この景品を削除しますか？')) return;
    try {
      await api.deletePrize(id);
      loadPrizes();
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
  };

  return (
    <div className="space-y-4">
      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {message.text}
          <button onClick={() => setMessage(null)} className="float-right font-bold">×</button>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={() => { resetForm(); setShowCreate(!showCreate); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
          + 新規作成
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <h3 className="font-bold text-gray-700">{editingId ? '景品を編集' : '景品を新規作成'}</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">景品名 *</label>
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" rows="2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">必要ポイント *</label>
              <input type="number" value={form.points_required} onChange={e => setForm({...form, points_required: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                required min="1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">在庫数</label>
              <input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                min="0" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {loading ? '処理中...' : (editingId ? '更新' : '作成')}
            </button>
            <button type="button" onClick={resetForm}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200">
              キャンセル
            </button>
          </div>
        </form>
      )}

      {prizes.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">景品がまだありません</p>
      ) : (
        <div className="space-y-3">
          {prizes.map(prize => (
            <div key={prize.id} className={`bg-white rounded-xl p-4 shadow-sm ${!prize.is_active ? 'opacity-50' : ''}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-800">{prize.name}</h3>
                    {!prize.is_active && <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">削除済み</span>}
                  </div>
                  {prize.description && <p className="text-sm text-gray-500 mt-1">{prize.description}</p>}
                  <p className="text-sm mt-1">
                    <span className="text-blue-600 font-bold">{prize.points_required}pt</span>
                    <span className="text-gray-400 ml-3">在庫: {prize.stock}</span>
                  </p>
                </div>
                {prize.is_active && (
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(prize)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(prize.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userHistory, setUserHistory] = useState([]);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data.users);
    } catch (err) { console.error(err); }
  };

  const viewHistory = async (user) => {
    setSelectedUser(user);
    try {
      const data = await api.getUserHistory(user.id);
      setUserHistory(data.history);
    } catch (err) { console.error(err); }
  };

  if (selectedUser) {
    return (
      <div className="space-y-4">
        <button onClick={() => { setSelectedUser(null); setUserHistory([]); }}
          className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:text-blue-700">
          ← ユーザー一覧に戻る
        </button>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-800">{selectedUser.display_name}</h3>
          <p className="text-sm text-gray-500">@{selectedUser.username}</p>
          <p className="text-blue-600 font-bold text-lg mt-2">{selectedUser.points}pt</p>
        </div>
        <h4 className="font-bold text-gray-700">ポイント履歴</h4>
        {userHistory.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">履歴なし</p>
        ) : (
          <div className="space-y-2">
            {userHistory.map(h => (
              <div key={h.id} className="bg-white rounded-xl p-4 flex justify-between items-center shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${h.type === 'earn' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {h.type === 'earn' ? '獲得' : '消費'}
                    </span>
                    <p className="text-sm font-medium text-gray-800">{h.description}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{new Date(h.created_at).toLocaleString('ja-JP')}</p>
                </div>
                <span className={`font-bold ${h.type === 'earn' ? 'text-green-500' : 'text-red-500'}`}>
                  {h.type === 'earn' ? '+' : ''}{h.points}pt
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {users.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">ユーザーがいません</p>
      ) : (
        users.filter(u => u.role !== 'admin').map(user => (
          <div key={user.id} className="bg-white rounded-xl p-4 shadow-sm flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-800">{user.display_name}</h3>
              <p className="text-sm text-gray-500">@{user.username}</p>
              <p className="text-xs text-gray-400 mt-1">登録: {new Date(user.created_at).toLocaleDateString('ja-JP')}</p>
            </div>
            <div className="text-right">
              <p className="text-blue-600 font-bold text-lg">{user.points}pt</p>
              <button onClick={() => viewHistory(user)}
                className="text-blue-600 text-xs hover:underline mt-1">
                履歴を見る
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function HistoryView() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.getAdminHistory().then(d => setHistory(d.history)).catch(console.error);
  }, []);

  return (
    <div className="space-y-2">
      {history.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">履歴がありません</p>
      ) : (
        history.map(h => (
          <div key={h.id} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${h.type === 'earn' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {h.type === 'earn' ? '獲得' : '消費'}
                  </span>
                  <span className="text-sm font-medium text-gray-800">{h.user_name}</span>
                  <span className="text-xs text-gray-400">@{h.username}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{h.description}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(h.created_at).toLocaleString('ja-JP')}</p>
              </div>
              <span className={`font-bold ${h.type === 'earn' ? 'text-green-500' : 'text-red-500'}`}>
                {h.type === 'earn' ? '+' : ''}{h.points}pt
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('stats');

  const tabs = [
    { id: 'stats', label: '統計', icon: '📊' },
    { id: 'qr', label: 'QR管理', icon: '📱' },
    { id: 'prizes', label: '景品', icon: '🎁' },
    { id: 'users', label: 'ユーザー', icon: '👥' },
    { id: 'history', label: '履歴', icon: '📋' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-gray-800 to-gray-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">管理者パネル</h1>
            <p className="text-gray-400 text-sm">{user?.display_name}</p>
          </div>
          <button onClick={logout} className="text-gray-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
            ログアウト
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 mt-6">
        {activeTab === 'stats' && <AdminStats />}
        {activeTab === 'qr' && <QRManagement />}
        {activeTab === 'prizes' && <PrizeManagement />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'history' && <HistoryView />}
      </div>

      {/* 下部ナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-2xl mx-auto flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${
                activeTab === tab.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
