import { useEffect, useState } from 'react';
import { getSessions } from '../../services/api/chat';
import './ChatSidebar.css';

export default function ChatSidebar({
  onNewChat,
  activeId,
  onSelectChat,
  user,
  onLogin,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const handleToggleSidebar = () => {
    setCollapsed(true);
  };

  const handleLogoIconClick = () => {
    setCollapsed(false);
  };


  const [history, setHistory] = useState([]);
  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    async function fetchSessions() {
      try {
        const sessions = await getSessions();
        // Cấu trúc lại dữ liệu cho giống với giao diện cũ (group có label và items)
        setHistory([
          {
            label: 'Tất cả cuộc trò chuyện',
            items: sessions
          }
        ]);
      } catch (error) {
        console.error("Lỗi khi lấy lịch sử chat:", error);
      }
    }
    fetchSessions();
  }, [activeId, user]);
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        {collapsed && <div className="sidebar-logo-icon" onClick={handleLogoIconClick}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        </div>}

        {!collapsed && <span className="sidebar-logo-text">TS AI Assistant</span>}

        {!collapsed && (
          <div className="sidebar-icon" onClick={handleToggleSidebar}>
            <span><i className="bi bi-layout-sidebar"></i></span>
          </div>
        )}
      </div>

      {/* New chat button */}
      {!collapsed && (
        <button className="new-chat-btn-sidebar" onClick={onNewChat}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Hội thoại mới
        </button>
      )}

      {/* History */}
      {!collapsed && (
        <div className="sidebar-history">
          {history.map((group) => (
            <div key={group.label} className="history-group">
              <p className="history-group-label">{group.label}</p>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={`history-item ${activeId === item.id ? 'active' : ''}`}
                  onClick={() => onSelectChat?.(item.id)}
                >
                  {item.title}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* User profile */}
      <div className="sidebar-user">
        {user ? (
          <>
            <div className="user-info">
              <div className="user-avatar-sm">
              {user.picture ? <img src={user.picture} alt="" /> : (user.initials || 'TS')}
            </div>
            <span className="user-name">{user.name}</span>
            </div>
          </>
        ) : (
          <button className="login" type="button" onClick={onLogin}>Đăng nhập</button>
        )}
      </div>

    </aside>
  );
}
