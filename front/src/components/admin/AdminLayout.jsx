import "./AdminLayout.css";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

export default function AdminLayout({ activePage, children }) {
  return (
    <main className="rag-admin-shell">
      <AdminSidebar activePage={activePage} />
      <section className="rag-content">
        <AdminTopbar activePage={activePage} />
        {children}
      </section>
    </main>
  );
}
