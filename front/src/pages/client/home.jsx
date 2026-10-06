import { useEffect } from "react";
import { Link } from "react-router-dom";
import "./home.css";
import ctutLogo from "../../assets/ctut.png";
import sangImage from "../../assets/sang.png";
import chieuImage from "../../assets/chieu.png";
import toiImage from "../../assets/toi.png";

const features = [
  {
    number: "01",
    title: "Học từ thực tiễn",
    text: "Kết nối kiến thức chuyên môn với bài tập, dự án và những vấn đề thực tế.",
    icon: "bi bi-lightning-charge",
  },
  {
    number: "02",
    title: "Mở rộng cơ hội nghề nghiệp",
    text: "Rèn kỹ năng chuyên môn và kỹ năng làm việc để sẵn sàng cho hành trình sau tốt nghiệp.",
    icon: "bi bi-briefcase",
  },
  {
    number: "03",
    title: "Trải nghiệm tuổi trẻ tại CTUT",
    text: "Học tập, kết nối và khám phá bản thân trong cộng đồng sinh viên năng động.",
    icon: "bi bi-people",
  },
];

const studyAreas = [
  { title: "Công nghệ", icon: "bi bi-cpu", text: "Khám phá thế giới số, dữ liệu và những giải pháp công nghệ mới." },
  { title: "Kỹ thuật", icon: "bi bi-gear-wide-connected", text: "Biến kiến thức khoa học thành sản phẩm và giá trị ứng dụng." },
  { title: "Kinh tế & dịch vụ", icon: "bi bi-graph-up-arrow", text: "Phát triển tư duy quản lý, kinh doanh và vận hành." },
];

function Home() {
  useEffect(() => {
    import("./main.js");
  }, []);

  return (
    <main className="admissions-page">
      <header className="admissions-header">
        <a className="brand" href="#home" aria-label="CTUT - Trang chủ">
          <img src={ctutLogo} alt="Logo Trường Đại học Kỹ thuật - Công nghệ Cần Thơ" />
          <span className="brand-copy">
            <p>TRƯỜNG ĐẠI HỌC <br />KỸ THUẬT - CÔNG NGHỆ CẦN THƠ</p>
          </span>
        </a>

        <nav className="main-nav" aria-label="Điều hướng chính">
          <a href="#home">Trang chủ</a>
          <a href="#nganh-hoc">Ngành học</a>
          <a href="#ve-ctut">Về CTUT</a>
          <a href="#tuyen-sinh">Tuyển sinh</a>
        </nav>

        <Link className="header-cta" to="/chat">
          Tư vấn tuyển sinh <i className="bi bi-arrow-up-right" aria-hidden="true" />
        </Link>
      </header>

      <section className="hero-section" id="home">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> TUYỂN SINH ĐẠI HỌC 2026</span>
          <h1>Chọn tương lai.<br /><span>Kiến tạo ngày mai.</span></h1>
          <p>Khởi đầu hành trình của bạn tại Trường Đại học Kỹ thuật - Công nghệ Cần Thơ. Học điều mình yêu thích, làm chủ những cơ hội mới.</p>
          <div className="hero-actions">
            <a className="button button-light" href="#tuyen-sinh">Khám phá tuyển sinh <i className="bi bi-arrow-down-right" /></a>
            <Link className="button button-outline" to="/chat"><i className="bi bi-chat-dots" /> Hỏi đáp cùng CTUT</Link>
          </div>
          <div className="hero-note"><i className="bi bi-geo-alt-fill" /> Cần Thơ · Đồng hành cùng khát vọng miền Tây</div>
        </div>

        <div className="hero-visual-wrap">
          <div className="visual-label"><span className="live-dot" /> KHUÔN VIÊN CTUT <span className="visual-label-line" /></div>
          <div id="app" className="phase-sang" aria-label="Hình ảnh khuôn viên CTUT chuyển động">
            <div id="scene-viewport">
              <div id="scene-container">
                <canvas id="sky-canvas" aria-hidden="true" />
                <div className="building-wrapper">
                  <img id="img-sang" className="scene-img" src={sangImage} alt="Khuôn viên CTUT ban ngày" />
                  <img id="img-chieu" className="scene-img" src={chieuImage} alt="Khuôn viên CTUT lúc hoàng hôn" />
                  <img id="img-toi" className="scene-img" src={toiImage} alt="Khuôn viên CTUT ban đêm" />
                  <canvas id="traffic-canvas" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
          <div className="visual-stamp"><span>CTUT</span><small>HỌC TẬP<br />VÀ SÁNG TẠO</small></div>
        </div>
        <div className="hero-index"><span>01</span><i /> KHÁM PHÁ HÀNH TRÌNH</div>
      </section>

      <section className="intro-strip" id="ve-ctut">
        <p><span className="strip-kicker">TƯƠNG LAI BẮT ĐẦU TỪ ĐÂY</span> Một lựa chọn hôm nay, mở ra nhiều con đường ngày mai.</p>
        <a href="#nganh-hoc">Tìm hiểu CTUT <i className="bi bi-arrow-right" /></a>
      </section>

      <section className="content-section study-section" id="nganh-hoc">
        <div className="section-heading">
          <div><span className="section-kicker">CHỌN ĐÚNG ĐIỀU BẠN MUỐN</span><h2>Tìm lĩnh vực<br />khơi nguồn cảm hứng.</h2></div>
          <p>Khám phá các nhóm lĩnh vực đào tạo tại CTUT và bắt đầu định hình con đường phù hợp với thế mạnh của bạn.</p>
        </div>
        <div className="study-grid">
          {studyAreas.map((area, index) => (
            <article className="study-card" key={area.title}>
              <span className="card-index">0{index + 1} / LĨNH VỰC</span>
              <div className="study-icon"><i className={area.icon} /></div>
              <h3>{area.title}</h3>
              <p>{area.text}</p>
              <a href="#tuyen-sinh" aria-label={`Tìm hiểu ${area.title}`}><i className="bi bi-arrow-up-right" /></a>
            </article>
          ))}
        </div>
        <p className="study-footnote"><i className="bi bi-info-circle" /> Thông tin ngành và phương thức xét tuyển được cập nhật theo đề án tuyển sinh chính thức của trường.</p>
      </section>

      <section className="feature-section">
        <div className="feature-heading"><span className="section-kicker">HỌC ĐỂ LÀM ĐƯỢC</span><h2>Không chỉ là một tấm bằng.<br /><span>Là hành trang cho bạn.</span></h2></div>
        <div className="feature-list">
          {features.map((feature) => (
            <article className="feature-row" key={feature.number}>
              <span className="feature-number">{feature.number}</span>
              <i className={`${feature.icon} feature-icon`} />
              <div><h3>{feature.title}</h3><p>{feature.text}</p></div>
              <i className="bi bi-arrow-up-right feature-arrow" />
            </article>
          ))}
        </div>
      </section>

      <section className="admission-cta" id="tuyen-sinh">
        <div className="cta-orbit cta-orbit-one" /><div className="cta-orbit cta-orbit-two" />
        <div className="cta-content"><span className="section-kicker">BẠN ĐÃ SẴN SÀNG?</span><h2>Hành trình CTUT<br />đang chờ bạn.</h2><p>Để lại câu hỏi cho đội ngũ tư vấn hoặc khám phá thông tin tuyển sinh mới nhất.</p>
          <div className="hero-actions"><Link className="button button-light" to="/chat">Nhận tư vấn ngay <i className="bi bi-arrow-up-right" /></Link><a className="button button-outline" href="#nganh-hoc">Xem các lĩnh vực học</a></div>
        </div>
        <div className="cta-logo"><img src={ctutLogo} alt="" /></div>
      </section>

      <footer className="admissions-footer"><a className="footer-brand" href="#home"><img src={ctutLogo} alt="" /> CTUT</a><span>TRƯỜNG ĐẠI HỌC KỸ THUẬT - CÔNG NGHỆ CẦN THƠ</span><a href="#home">Lên đầu trang <i className="bi bi-arrow-up" /></a></footer>
    </main>
  );
}

export default Home;
