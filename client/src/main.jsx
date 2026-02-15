import React from 'react'
import ReactDOM from 'react-dom/client'
import UserApp from './UserApp.jsx'
import AdminApp from './AdminApp.jsx'
import './index.css'

// URLパスでモードを判定
const isAdmin = window.location.pathname.startsWith('/admin');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdmin ? <AdminApp /> : <UserApp />}
  </React.StrictMode>,
)
