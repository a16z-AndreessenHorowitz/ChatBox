import { Link } from "react-router-dom";

const navigation = [
  ["Tổng quan", "bi-grid-1x2-fill", "/admin"],
  ["Kho tri thức", "bi-database", "/admin/document_knowledge"],
  ["Đánh giá RAG", "bi-clipboard2-data", "/admin/rag_evaluation"],
  ["Hội thoại", "bi-chat-left-text", "#conversations"],
  ["Người dùng", "bi-people", "#users"],
  ["Phân tích", "bi-bar-chart-line", "#analytics"],
];

export default function AdminSidebar({ activePage }) {
  return (
    <aside className="rag-sidebar">
      <div className="rag-brand">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
        <span>TS ADMIN</span>
      </div>
      <p className="sidebar-label">QUẢN LÝ HỆ THỐNG</p>
      <nav className="rag-nav">
        {navigation.map(([name, icon, path]) => (
          <Link
            key={name}
            to={path}
            className={activePage === name ? "active" : ""}
          >
            <i className={`bi ${icon}`} />
            {name}
          </Link>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button>
          <i className="bi bi-gear" />
          Cài đặt
        </button>
        <div className="admin-profile">
          <div className="avatar">HN</div>
          <div>
            <b>Huy Nguyễn</b>
            <small>Quản trị viên</small>
          </div>
          <i className="bi bi-three-dots-vertical" />
        </div>
      </div>
    </aside>
  );
}
