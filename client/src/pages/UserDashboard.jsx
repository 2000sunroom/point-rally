import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { useAuth } from '../AuthContext';
import { api } from '../api';

function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const foundRef = useRef(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('カメラを起動中...');

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function startCamera() {
      // カメラ対応チェック
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('このブラウザはカメラに対応していません。HTTPS環境またはlocalhostで開いてください。');
        return;
      }

      try {
        // 背面カメラ優先で取得
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
          });
        } catch {
          // 背面カメラが無い場合はフロントカメラ
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } }
          });
        }

        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        await video.play();

        setStatus('QRコードをカメラに向けてください');

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        function scanFrame() {
          if (!mounted || foundRef.current) return;

          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (qrCode && qrCode.data) {
              foundRef.current = true;
              stopCamera();
              onScan(qrCode.data);
              return;
            }
          }
          rafRef.current = requestAnimationFrame(scanFrame);
        }

        scanFrame();
      } catch (err) {
        if (!mounted) return;
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('カメラへのアクセスが拒否されました。ブラウザの設定でカメラを許可してください。');
        } else if (err.name === 'NotFoundError') {
          setError('カメラが見つかりません。カメラが接続されているか確認してください。');
        } else if (err.name === 'NotReadableError') {
          setError('カメラが他のアプリで使用中です。他のアプリを閉じてから再試行してください。');
        } else {
          setError('カメラの起動に失敗しました: ' + err.message);
        }
      }
    }

    startCamera();

    return () => {
      mounted = false;
      stopCamera();
    };
  }, [onScan, stopCamera]);

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-4 flex justify-between items-center border-b">
          <h3 className="font-bold text-lg">QRコードスキャン</h3>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="relative bg-black aspect-square overflow-hidden">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="text-center">
                <svg className="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-white text-sm">{error}</p>
              </div>
            </div>
          ) : (
            <>
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              {/* スキャンガイド枠 */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-52 h-52">
                  <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-blue-400 rounded-tl-xl"></div>
                  <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-blue-400 rounded-tr-xl"></div>
                  <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-blue-400 rounded-bl-xl"></div>
                  <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-blue-400 rounded-br-xl"></div>
                  {/* スキャンライン */}
                  <div className="absolute top-0 left-2 right-2 h-0.5 bg-blue-400 animate-[scan_2s_ease-in-out_infinite]"></div>
                </div>
              </div>
            </>
          )}
          {/* 非表示のキャンバス（QR解析用） */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <div className="p-4 text-center">
          <p className="text-sm text-gray-500">{error ? '' : status}</p>
        </div>
      </div>
    </div>
  );
}

export default function UserDashboard() {
  const { user, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return ['home', 'prizes', 'history'].includes(hash) ? hash : 'home';
  });

  const changeTab = (tab) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };
  const [prizes, setPrizes] = useState([]);
  const [history, setHistory] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPrizes();
    loadHistory();
  }, []);

  const loadPrizes = async () => {
    try {
      const data = await api.getPrizes();
      setPrizes(data.prizes);
    } catch (err) {
      console.error(err);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await api.getHistory();
      setHistory(data.history);
    } catch (err) {
      console.error(err);
    }
  };

  const handleScan = async (code) => {
    setShowScanner(false);
    setLoading(true);
    setMessage(null);

    try {
      // 位置情報取得
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const result = await api.scanQR(code, position.coords.latitude, position.coords.longitude);
      setMessage({ type: 'success', text: result.message });
      await refreshUser();
      loadHistory();
    } catch (err) {
      if (err.code === 1) {
        setMessage({ type: 'error', text: '位置情報へのアクセスが拒否されました。ブラウザの設定で位置情報を許可してください。' });
      } else {
        setMessage({ type: 'error', text: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (prizeId, prizeName) => {
    if (!confirm(`「${prizeName}」と交換しますか？`)) return;
    setLoading(true);
    setMessage(null);

    try {
      const result = await api.redeemPrize(prizeId);
      setMessage({ type: 'success', text: result.message });
      await refreshUser();
      loadPrizes();
      loadHistory();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const tabIcons = {
    home: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
    prizes: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
    ),
    history: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  };

  const tabs = [
    { id: 'home', label: 'ホーム' },
    { id: 'prizes', label: '景品' },
    { id: 'history', label: '履歴' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-lg mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">スタンプラリー</h1>
            <p className="text-blue-200 text-sm">{user?.display_name}さん</p>
          </div>
          <button onClick={logout} className="text-blue-200 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
            ログアウト
          </button>
        </div>
      </header>

      {/* メッセージ */}
      {message && (
        <div className="max-w-lg mx-auto px-4 mt-4">
          <div className={`px-4 py-3 rounded-xl text-sm ${
            message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
            <button onClick={() => setMessage(null)} className="float-right font-bold">×</button>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4">
        {/* ホームタブ */}
        {activeTab === 'home' && (
          <div className="mt-6 space-y-6">
            {/* ポイントカード */}
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
              <p className="text-blue-200 text-sm">現在のポイント</p>
              <p className="text-5xl font-bold mt-2">{user?.points || 0}<span className="text-xl ml-1">pt</span></p>
            </div>

            {/* QRスキャンボタン */}
            <button
              onClick={() => setShowScanner(true)}
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold py-4 rounded-2xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              {loading ? '処理中...' : 'QRコードをスキャン'}
            </button>

            {/* 最近の履歴 */}
            <div>
              <h3 className="font-bold text-gray-700 mb-3">最近のアクティビティ</h3>
              {history.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">まだ履歴がありません</p>
              ) : (
                <div className="space-y-2">
                  {history.slice(0, 5).map((h) => (
                    <div key={h.id} className="bg-white rounded-xl p-4 flex justify-between items-center shadow-sm">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{h.description}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(h.created_at).toLocaleString('ja-JP')}</p>
                      </div>
                      <span className={`font-bold text-lg ${h.type === 'earn' ? 'text-green-500' : 'text-red-500'}`}>
                        {h.type === 'earn' ? '+' : ''}{h.points}pt
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 景品タブ */}
        {activeTab === 'prizes' && (
          <div className="mt-6">
            <h2 className="text-lg font-bold text-gray-700 mb-4">景品一覧</h2>
            {prizes.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-12">景品がまだ登録されていません</p>
            ) : (
              <div className="space-y-3">
                {prizes.map((prize) => {
                  const canRedeem = user?.points >= prize.points_required && prize.stock > 0;
                  const progress = Math.min(100, ((user?.points || 0) / prize.points_required) * 100);
                  return (
                    <div key={prize.id} className="bg-white rounded-2xl p-5 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800">{prize.name}</h3>
                          {prize.description && (
                            <p className="text-sm text-gray-500 mt-1">{prize.description}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">在庫: {prize.stock}個</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-blue-600 font-bold text-lg">{prize.points_required}<span className="text-sm">pt</span></p>
                        </div>
                      </div>
                      {/* プログレスバー */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>{user?.points || 0} / {prize.points_required} pt</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRedeem(prize.id, prize.name)}
                        disabled={!canRedeem || loading}
                        className={`mt-3 w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          canRedeem
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {prize.stock <= 0 ? '在庫なし' : canRedeem ? '交換する' : `あと${prize.points_required - (user?.points || 0)}pt必要`}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 履歴タブ */}
        {activeTab === 'history' && (
          <div className="mt-6">
            <h2 className="text-lg font-bold text-gray-700 mb-4">ポイント履歴</h2>
            {history.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-12">まだ履歴がありません</p>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="bg-white rounded-xl p-4 flex justify-between items-center shadow-sm">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          h.type === 'earn' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {h.type === 'earn' ? '獲得' : '消費'}
                        </span>
                        <p className="text-sm font-medium text-gray-800">{h.description}</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5">{new Date(h.created_at).toLocaleString('ja-JP')}</p>
                    </div>
                    <span className={`font-bold text-lg ${h.type === 'earn' ? 'text-green-500' : 'text-red-500'}`}>
                      {h.type === 'earn' ? '+' : ''}{h.points}pt
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* QRスキャナーモーダル */}
      {showScanner && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* 下部ナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200/60">
        <div className="max-w-lg mx-auto flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => changeTab(tab.id)}
              className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 transition-all ${
                activeTab === tab.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-500'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${activeTab === tab.id ? 'bg-blue-50' : ''}`}>
                {tabIcons[tab.id]}
              </div>
              <span className={`text-[10px] font-semibold ${activeTab === tab.id ? 'text-blue-600' : ''}`}>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
