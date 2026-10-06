import AdminLayout from "../../components/admin/AdminLayout";
import "./dashBoard.css";

export default function DashBoard() {
  const range = "7 ngày qua";
  return (
    <AdminLayout activePage="Tổng quan">
      <div className="dashboard-body">
        <div className="page-heading">
          <div>
            <p className="eyebrow">TRUNG TÂM ĐIỀU HÀNH</p>
            <h1>
              Xin chào, Quản trị viên <span>✦</span>
            </h1>
            <p>Theo dõi hiệu suất trợ lý AI và kho tri thức của bạn.</p>
          </div>
          <button className="date-control">
            <i className="bi bi-calendar3" />
            {range}
            <i className="bi bi-chevron-down" />
          </button>
        </div>
        <div className="metrics-grid">
          <Metric
            icon="bi-chat-dots"
            title="Tổng hội thoại"
            value="2,847"
            change="12.5%"
            tone="purple"
            chart="up"
          />
          <Metric
            icon="bi-people"
            title="Người dùng hoạt động"
            value="486"
            change="8.2%"
            tone="blue"
            chart="up"
          />
          <Metric
            icon="bi-database"
            title="Tài liệu đã lập chỉ mục"
            value="128"
            change="6 tài liệu"
            tone="orange"
            chart="neutral"
          />
          <Metric
            icon="bi-lightning-charge"
            title="Độ chính xác phản hồi"
            value="94.8%"
            change="2.1%"
            tone="green"
            chart="up"
          />
        </div>
      </div>
    </AdminLayout>
  );
}

function Metric({ icon, title, value, change, tone, chart }) {
  return (
    <section className="metric-card">
      <div className={`metric-icon ${tone}`}>
        <i className={`bi ${icon}`} />
      </div>
      <div className="metric-copy">
        <p>{title}</p>
        <h2>{value}</h2>
        <span className={chart === "up" ? "positive" : "neutral"}>
          <i className={`bi ${chart === "up" ? "bi-arrow-up" : "bi-plus"}`} />
          {change}
        </span>
        <small>
          {chart === "up" ? " so với tuần trước" : " trong tuần này"}
        </small>
      </div>
      <div className={`mini-bars ${tone}`}>
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
    </section>
  );
}
