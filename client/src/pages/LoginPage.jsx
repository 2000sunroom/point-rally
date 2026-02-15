import React, { useState } from 'react';
import { useAuth } from '../AuthContext';

export default function LoginPage({ mode = 'user' }) {
  const isAdmin = mode === 'admin';
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!isAdmin && isRegister) {
        const user = await register(username, password, displayName);
        if (user.role === 'admin') {
          setError('管理者アカウントではこのサイトを利用できません。');
          return;
        }
      } else {
        const user = await login(username, password);
        if (isAdmin && user.role !== 'admin') {
          setError('管理者アカウントでログインしてください。');
          localStorage.removeItem('token');
          return;
        }
        if (!isAdmin && user.role === 'admin') {
          setError('管理者アカウントではこのサイトを利用できません。管理者サイトは /admin からアクセスしてください。');
          localStorage.removeItem('token');
          return;
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const gradientClass = isAdmin
    ? 'from-gray-700 via-gray-800 to-gray-900'
    : 'from-blue-500 via-blue-600 to-indigo-700';

  const accentColor = isAdmin ? 'gray' : 'blue';
  const iconBg = isAdmin ? 'bg-gray-200' : 'bg-blue-100';
  const iconColor = isAdmin ? 'text-gray-700' : 'text-blue-600';
  const btnClass = isAdmin
    ? 'bg-gray-700 hover:bg-gray-800 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';
  const focusRing = isAdmin ? 'focus:ring-gray-500' : 'focus:ring-blue-500';
  const tabActive = isAdmin ? 'text-gray-700' : 'text-blue-600';

  return (
    <div className={`min-h-screen bg-gradient-to-br ${gradientClass} flex items-center justify-center p-4`}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 ${iconBg} rounded-full mb-4`}>
            {isAdmin ? (
              <svg className={`w-8 h-8 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            ) : (
              <svg className={`w-8 h-8 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isAdmin ? '管理者パネル' : 'スタンプラリー'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isAdmin ? 'スタンプラリー管理システム' : 'スポーツクラブ ポイントプログラム'}
          </p>
        </div>

        {/* タブ切り替え（ユーザーサイトのみ） */}
        {!isAdmin && (
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setIsRegister(false); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                !isRegister ? `bg-white ${tabActive} shadow-sm` : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ログイン
            </button>
            <button
              onClick={() => { setIsRegister(true); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isRegister ? `bg-white ${tabActive} shadow-sm` : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              新規登録
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isAdmin && isRegister && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">表示名</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={`w-full px-4 py-3 border border-gray-200 rounded-xl ${focusRing} focus:ring-2 focus:border-transparent outline-none transition-all`}
                placeholder="田中太郎"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ユーザー名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full px-4 py-3 border border-gray-200 rounded-xl ${focusRing} focus:ring-2 focus:border-transparent outline-none transition-all`}
              placeholder={isAdmin ? 'admin' : 'username'}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 border border-gray-200 rounded-xl ${focusRing} focus:ring-2 focus:border-transparent outline-none transition-all`}
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full ${btnClass} font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? '処理中...' : (isRegister ? '登録' : 'ログイン')}
          </button>
        </form>
      </div>
    </div>
  );
}
