export default function AdminTopbar({ activePage }) {
  return (
    <header className="rag-topbar">
      <button className="mobile-menu" aria-label="Mở menu"><i className="bi bi-list" /></button>
      <div className="breadcrumb">Quản trị <i className="bi bi-chevron-right" /> <span>{activePage}</span></div>
      <div className="top-actions">
        <button className="top-icon" aria-label="Thông báo"><i className="bi bi-bell" /><em /></button>
        <button className="help-button"><i className="bi bi-question-circle" />Trợ giúp</button>
      </div>
    </header>
  );
}
