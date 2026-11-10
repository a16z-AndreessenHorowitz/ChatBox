import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ctutLogo from '../../assets/ctut.png';
import { useAuth } from '../../auth/AuthProvider.jsx';
import './Home.css';

const POPULAR_QUESTIONS = [
  'Điểm chuẩn ngành Công nghệ thông tin năm 2024?',
  'Phương thức xét học bạ vào CTUT cần điều kiện gì?',
  'Chỉ tiêu và tổ hợp môn ngành Công nghệ Kỹ thuật Ô tô?',
  'Mức học phí các ngành kỹ thuật năm 2025 là bao nhiêu?',
  'Chính sách học bổng và miễn giảm học phí cho tân sinh viên?',
];

const ADMISSION_METHODS = [
  {
    code: 'PT 1 (Mã 100)',
    title: 'Xét tuyển theo kết quả thi Tốt nghiệp THPT',
    desc: 'Xét tuyển dựa trên điểm thi tốt nghiệp THPT theo các tổ hợp môn tương ứng của từng ngành đào tạo.',
    prompt: 'Tư vấn chi tiết về phương thức xét điểm thi tốt nghiệp THPT vào CTUT',
  },
  {
    code: 'PT 2 (Mã 200)',
    title: 'Xét tuyển theo kết quả học tập THPT (Học bạ)',
    desc: 'Xét tổng điểm trung bình 3 môn theo tổ hợp của 5 học kỳ (HK1, HK2 lớp 10; HK1, HK2 lớp 11 và HK1 lớp 12) hoặc cả năm lớp 12.',
    prompt: 'Quy định và cách tính điểm xét học bạ THPT vào các ngành của CTUT',
  },
  {
    code: 'PT 3 (Mã 402)',
    title: 'Xét kết quả thi Đánh giá năng lực ĐHQG-HCM',
    desc: 'Dành cho thí sinh tham dự kỳ thi Đánh giá năng lực do Đại học Quốc gia TP.HCM tổ chức trong năm tuyển sinh.',
    prompt: 'Thông tin xét điểm thi Đánh giá năng lực ĐHQG-HCM vào trường CTUT',
  },
  {
    code: 'PT 4 (Mã 301)',
    title: 'Tuyển thẳng và Ưu tiên xét tuyển',
    desc: 'Thực hiện theo quy chế tuyển sinh hiện hành của Bộ Giáo dục & Đào tạo và quy định riêng của nhà trường.',
    prompt: 'Điều kiện tuyển thẳng và ưu tiên xét tuyển của Trường ĐH Kỹ thuật Công nghệ Cần Thơ',
  },
];

const MAJORS_LIST = [
  {
    category: 'it',
    code: '7480201',
    name: 'Công nghệ thông tin',
    combos: 'A00, A01, D01, D07',
    desc: 'Lập trình ứng dụng, trí tuệ nhân tạo, an toàn thông tin và điện toán đám mây.',
  },
  {
    category: 'it',
    code: '7480103',
    name: 'Kỹ thuật phần mềm',
    combos: 'A00, A01, D01, D07',
    desc: 'Quy trình phát triển phần mềm chuẩn quốc tế, kiến trúc hệ thống và DevOps.',
  },
  {
    category: 'it',
    code: '7480109',
    name: 'Khoa học dữ liệu',
    combos: 'A00, A01, D01, D07',
    desc: 'Khai phá dữ liệu lớn (Big Data), Machine Learning và trực quan hóa phân tích.',
  },
  {
    category: 'it',
    code: '7480104',
    name: 'Hệ thống thông tin',
    combos: 'A00, A01, D01, D07',
    desc: 'Phân tích thiết kế hệ thống thông tin doanh nghiệp và chuyển đổi số.',
  },
  {
    category: 'eng',
    code: '7510205',
    name: 'Công nghệ kỹ thuật Ô tô',
    combos: 'A00, A01, C01, D01',
    desc: 'Chẩn đoán kỹ thuật, động cơ xe điện - Hybrid, tự động hóa ô tô thông minh.',
  },
  {
    category: 'eng',
    code: '7520114',
    name: 'Kỹ thuật Cơ điện tử',
    combos: 'A00, A01, C01, D01',
    desc: 'Robot công nghiệp, hệ thống tự động, tích hợp phần mềm - phần cứng thông minh.',
  },
  {
    category: 'eng',
    code: '7520216',
    name: 'Kỹ thuật Điều khiển & Tự động hoá',
    combos: 'A00, A01, C01, D01',
    desc: 'Hệ thống điều khiển SCADA, PLC, IoT công nghiệp và dây chuyền sản xuất tự động.',
  },
  {
    category: 'eng',
    code: '7520201',
    name: 'Kỹ thuật Điện',
    combos: 'A00, A01, C01, D01',
    desc: 'Năng lượng tái tạo, lưới điện thông minh, cung cấp và phân phối điện công nghiệp.',
  },
  {
    category: 'build',
    code: '7580201',
    name: 'Kỹ thuật Xây dựng',
    combos: 'A00, A01, C01, D01',
    desc: 'Thiết kế kết cấu công trình dân dụng & công nghiệp, mô hình BIM hiện đại.',
  },
  {
    category: 'build',
    code: '7540101',
    name: 'Công nghệ Thực phẩm',
    combos: 'A00, B00, D07, D08',
    desc: 'Chế biến, bảo quản nông thủy sản, kiểm định an toàn chất lượng thực phẩm.',
  },
  {
    category: 'biz',
    code: '7510605',
    name: 'Logistics & Quản lý chuỗi cung ứng',
    combos: 'A00, A01, D01, D07',
    desc: 'Quản trị kho vận, vận tải đa phương thức, xuất nhập khẩu và phân phối hàng hóa.',
  },
  {
    category: 'biz',
    code: '7510601',
    name: 'Quản lý Công nghiệp',
    combos: 'A00, A01, D01, D07',
    desc: 'Tối ưu hóa quy trình sản xuất, quản lý dự án công nghệ và chuỗi vận hành.',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuestion, setSearchQuestion] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const handleAskQuestion = (questionText) => {
    const q = questionText.trim();
    if (!q) {
      navigate('/chat');
      return;
    }
    navigate('/chat', { state: { initialQuestion: q } });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    handleAskQuestion(searchQuestion);
  };

  const filteredMajors = selectedCategory === 'all'
    ? MAJORS_LIST
    : MAJORS_LIST.filter((m) => m.category === selectedCategory);

  return (
    <div className="home-container">
      {/* 1. TOP CONTACT BAR */}
      <div className="top-contact-bar d-none d-md-block">
        <div className="container d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-4">
            <span>
              <i className="bi bi-geo-alt-fill text-warning me-1"></i>
              256 Nguyễn Văn Cừ, P. An Hòa, Q. Ninh Kiều, TP. Cần Thơ
            </span>
            <span>
              <i className="bi bi-telephone-fill text-warning me-1"></i>
              Hotline: <a href="tel:02923898167">02923.898.167</a> - <a href="tel:0948571577">0948.571.577</a>
            </span>
            <span>
              <i className="bi bi-envelope-fill text-warning me-1"></i>
              <a href="mailto:tuyensinh@ctuet.edu.vn">tuyensinh@ctuet.edu.vn</a>
            </span>
          </div>
          <div className="d-flex align-items-center gap-3">
            <span className="top-ai-badge">
              <i className="bi bi-stars"></i> Trợ lý Tuyển sinh AI 24/7
            </span>
            <a
              href="https://ctuet.edu.vn"
              target="_blank"
              rel="noreferrer"
              className="d-flex align-items-center gap-1"
            >
              <span>ctuet.edu.vn</span>
              <i className="bi bi-box-arrow-up-right font-size-xs"></i>
            </a>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER & NAVIGATION */}
      <header className="main-header py-2">
        <div className="container d-flex align-items-center justify-content-between">
          <Link to="/" className="header-brand-link">
            <img src={ctutLogo} alt="CTUT Logo" className="header-logo" />
            <div className="brand-text-block">
              <div className="sub-agency">UBND THÀNH PHỐ CẦN THƠ</div>
              <div className="school-name">TRƯỜNG ĐẠI HỌC KỸ THUẬT - CÔNG NGHỆ CẦN THƠ</div>
              <div className="school-name-en">CAN THO UNIVERSITY OF TECHNOLOGY • MÃ TRƯỜNG: KCC</div>
            </div>
          </Link>

          <nav className="d-none d-lg-flex align-items-center gap-2">
            <a href="#hero" className="header-nav-link">Trang chủ</a>
            <a href="#gioi-thieu" className="header-nav-link">Giới thiệu</a>
            <a href="#tinh-nang" className="header-nav-link">Tính năng AI</a>
            <a href="#phuong-thuc" className="header-nav-link">Phương thức xét tuyển</a>
            <a href="#nganh-dao-tao" className="header-nav-link">Ngành đào tạo</a>
            <a href="#lien-he" className="header-nav-link">Liên hệ</a>
          </nav>

          <div className="d-flex align-items-center gap-2">
            <Link to="/chat" className="nav-ai-pill">
              <i className="bi bi-robot"></i>
              <span>Vào Chatbot AI</span>
            </Link>

            {user ? (
              <div className="d-flex align-items-center gap-2 ms-2">
                <span className="badge bg-light text-primary border p-2">
                  <i className="bi bi-person-circle me-1"></i>
                  {user.name || 'Người dùng'}
                </span>
                {user.role === 'ADMIN' && (
                  <Link to="/admin" className="btn btn-outline-secondary btn-sm">
                    Quản trị
                  </Link>
                )}
              </div>
            ) : (
              <div className="d-flex align-items-center gap-2 ms-2">
                <Link to="/login" className="btn btn-outline-primary btn-sm px-3 fw-semibold">
                  Đăng nhập
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION */}
      <section id="hero" className="hero-section">
        <div className="container position-relative">
          <div className="row align-items-center g-5">
            <div className="col-lg-7">
              <div className="hero-badge">
                <i className="bi bi-patch-check-fill text-warning"></i>
                HỆ THỐNG TRÍ TUỆ NHÂN TẠO TƯ VẤN TUYỂN SINH THẾ HỆ MỚI
              </div>
              <h1 className="hero-title">
                Giải Đáp Tuyển Sinh <span className="highlight-text">Nhanh Chóng & Chính Xác</span> Cùng AI CTUT
              </h1>
              <p className="hero-desc">
                Trợ lý ảo thông minh 24/7 ứng dụng công nghệ <strong>RAG & Google Gemini</strong>, 
                đối chiếu trực tiếp với các văn bản, đề án tuyển sinh chính thức của 
                <strong> Trường Đại học Kỹ thuật - Công nghệ Cần Thơ</strong>.
              </p>

              {/* Search Bar / Quick Prompt */}
              <form onSubmit={handleSearchSubmit} className="hero-search-card">
                <i className="bi bi-search text-muted ms-2 fs-5"></i>
                <input
                  type="text"
                  className="hero-search-input"
                  placeholder="Hỏi về điểm chuẩn, tổ hợp môn, học phí, xét học bạ..."
                  value={searchQuestion}
                  onChange={(e) => setSearchQuestion(e.target.value)}
                />
                <button type="submit" className="hero-search-btn">
                  <span>Hỏi AI ngay</span>
                  <i className="bi bi-arrow-right"></i>
                </button>
              </form>

              {/* Suggested Questions */}
              <div className="suggested-questions-wrap">
                <div className="suggested-label">
                  <i className="bi bi-lightbulb-fill text-warning"></i>
                  <span>Thí sinh thường hỏi:</span>
                </div>
                <div className="suggested-tags">
                  {POPULAR_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="suggested-tag"
                      onClick={() => handleAskQuestion(q)}
                    >
                      <span>{q}</span>
                      <i className="bi bi-arrow-up-right font-size-xs opacity-75"></i>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Hero Right: Live Interactive Mockup */}
            <div className="col-lg-5">
              <div className="hero-mockup-wrapper">
                <div className="ai-preview-card">
                  <div className="preview-card-header">
                    <div className="preview-bot-info">
                      <div className="preview-bot-avatar">
                        <i className="bi bi-robot"></i>
                      </div>
                      <div>
                        <div className="fw-bold fs-6">Trợ lý AI Tuyển sinh CTUT</div>
                        <div className="text-muted" style={{ fontSize: '12px' }}>
                          <span className="preview-status-dot"></span> Đang trực tuyến 24/7
                        </div>
                      </div>
                    </div>
                    <span className="badge bg-primary-subtle text-primary fw-semibold px-2 py-1">
                      KCC AI
                    </span>
                  </div>

                  <div className="preview-chat-body">
                    <div className="preview-bubble-user">
                      Điểm chuẩn ngành Công nghệ thông tin năm trước và phương thức xét học bạ như thế nào ạ?
                    </div>

                    <div className="preview-bubble-bot">
                      <div className="fw-semibold text-primary mb-1">
                        <i className="bi bi-robot me-1"></i> Trợ lý AI CTUT:
                      </div>
                      <p className="mb-2">Chào bạn! Dựa trên Đề án tuyển sinh chính thức của Trường ĐH Kỹ thuật - Công nghệ Cần Thơ:</p>
                      <ul className="ps-3 mb-2 small text-secondary">
                        <li><strong>Điểm chuẩn CNTT:</strong> Năm 2024 xét theo điểm thi THPT dao động từ <strong>22.50 điểm</strong> (tổ hợp A00, A01, D01, D07).</li>
                        <li><strong>Xét tuyển Học bạ:</strong> Tổng điểm trung bình 3 môn trong tổ hợp đạt từ <strong>18.00 điểm</strong> trở lên.</li>
                      </ul>
                      <div className="badge-source">
                        <i className="bi bi-file-earmark-check-fill me-1"></i>
                        Nguồn: Đề án Tuyển sinh ĐH Chính quy CTUT
                      </div>
                    </div>
                  </div>

                  <div className="preview-card-footer">
                    <button
                      type="button"
                      className="btn btn-primary w-100 fw-bold py-2 rounded-pill shadow-sm"
                      onClick={() => handleAskQuestion('Tư vấn ngành Công nghệ thông tin')}
                    >
                      <i className="bi bi-chat-dots-fill me-2"></i>
                      Mở cửa sổ Chatbot hỏi chi tiết hơn
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Stats Strip */}
          <div className="stats-strip">
            <div className="row g-4 text-center text-md-start">
              <div className="col-6 col-md-3">
                <div className="stat-item">
                  <div className="stat-icon">
                    <i className="bi bi-clock-history"></i>
                  </div>
                  <div>
                    <div className="stat-number">24/7</div>
                    <div className="stat-label">Giải đáp tức thì mọi lúc</div>
                  </div>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="stat-item">
                  <div className="stat-icon text-success">
                    <i className="bi bi-shield-check"></i>
                  </div>
                  <div>
                    <div className="stat-number">100%</div>
                    <div className="stat-label">Dữ liệu từ Đề án chính thức</div>
                  </div>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="stat-item">
                  <div className="stat-icon text-primary">
                    <i className="bi bi-mortarboard"></i>
                  </div>
                  <div>
                    <div className="stat-number">22+</div>
                    <div className="stat-label">Ngành đào tạo trọng điểm</div>
                  </div>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="stat-item">
                  <div className="stat-icon text-warning">
                    <i className="bi bi-briefcase"></i>
                  </div>
                  <div>
                    <div className="stat-number">96%</div>
                    <div className="stat-label">Sinh viên có việc làm sau TN</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 4. FEATURES SECTION */}
      <section id="tinh-nang" className="section-wrapper">
        <div className="container">
          <div className="section-title-wrap">
            <span className="section-pretitle">CÔNG NGHỆ THÔNG MINH</span>
            <h2 className="section-title">Tại Sao Nên Dùng Chatbot Tuyển Sinh CTUT?</h2>
            <p className="section-subtitle">
              Được thiết kế chuyên biệt để hỗ trợ quý phụ huynh và các bạn học sinh tra cứu thông tin tuyển sinh 
              nhanh chóng, minh bạch và tin cậy nhất.
            </p>
          </div>

          <div className="row g-4">
            <div className="col-md-6 col-lg-3">
              <div className="feature-card">
                <div className="feature-icon-box blue">
                  <i className="bi bi-lightning-charge-fill"></i>
                </div>
                <h3 className="feature-title">Tốc Độ Tức Thì</h3>
                <p className="feature-text">
                  Không còn phải đợi chờ phản hồi qua fanpage hay hotline vào mùa cao điểm. AI phản hồi câu hỏi chỉ trong vòng vài giây.
                </p>
              </div>
            </div>

            <div className="col-md-6 col-lg-3">
              <div className="feature-card">
                <div className="feature-icon-box green">
                  <i className="bi bi-check-all"></i>
                </div>
                <h3 className="feature-title">Chuẩn Xác 100%</h3>
                <p className="feature-text">
                  Ứng dụng công nghệ RAG nhúng vector, đối chiếu trực tiếp từ file văn bản, quyết định điểm chuẩn và đề án đã ban hành của CTUT.
                </p>
              </div>
            </div>

            <div className="col-md-6 col-lg-3">
              <div className="feature-card">
                <div className="feature-icon-box amber">
                  <i className="bi bi-search"></i>
                </div>
                <h3 className="feature-title">Tra Cứu Đa Chiều</h3>
                <p className="feature-text">
                  Hỏi đáp linh hoạt về điểm chuẩn qua các năm, tổ hợp xét tuyển, chỉ tiêu, biểu phí học kỳ, chính sách miễn giảm và ký túc xá.
                </p>
              </div>
            </div>

            <div className="col-md-6 col-lg-3">
              <div className="feature-card">
                <div className="feature-icon-box purple">
                  <i className="bi bi-compass-fill"></i>
                </div>
                <h3 className="feature-title">Tư Vấn Chọn Ngành</h3>
                <p className="feature-text">
                  Nhập điểm thi hoặc sở thích cá nhân, trợ lý AI sẽ phân tích và gợi ý những ngành học có cơ hội trúng tuyển cao nhất cho bạn.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ADMISSION METHODS SECTION */}
      <section id="phuong-thuc" className="section-wrapper bg-light-blue">
        <div className="container">
          <div className="section-title-wrap">
            <span className="section-pretitle">ĐỀ ÁN TUYỂN SINH 2025</span>
            <h2 className="section-title">4 Phương Thức Xét Tuyển Chính Quy</h2>
            <p className="section-subtitle">
              Trường Đại học Kỹ thuật - Công nghệ Cần Thơ tạo mọi điều kiện thuận lợi nhất để thí sinh phát huy thế mạnh của mình.
            </p>
          </div>

          <div className="row g-4">
            {ADMISSION_METHODS.map((method, index) => (
              <div key={index} className="col-md-6 col-lg-3">
                <div className="method-card">
                  <span className="method-badge">{method.code}</span>
                  <h4 className="method-title">{method.title}</h4>
                  <p className="method-desc">{method.desc}</p>
                  <button
                    type="button"
                    className="method-cta-btn btn p-0 text-start border-0 bg-transparent"
                    onClick={() => handleAskQuestion(method.prompt)}
                  >
                    <span>Hỏi AI về phương thức này</span>
                    <i className="bi bi-arrow-right"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. MAJORS CATALOG SECTION */}
      <section id="nganh-dao-tao" className="section-wrapper">
        <div className="container">
          <div className="section-title-wrap">
            <span className="section-pretitle">CHƯƠNG TRÌNH ĐÀO TẠO</span>
            <h2 className="section-title">Các Ngành Đào Tạo Trọng Điểm</h2>
            <p className="section-subtitle">
              Chương trình đào tạo gắn liền với thực tiễn, định hướng ứng dụng kỹ thuật và đáp ứng nhu cầu nhân lực công nghệ cao.
            </p>

            {/* Filter Tabs */}
            <div className="d-flex flex-wrap justify-content-center gap-2 mt-4">
              <button
                type="button"
                className={`major-tab-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                Tất cả ngành ({MAJORS_LIST.length})
              </button>
              <button
                type="button"
                className={`major-tab-btn ${selectedCategory === 'it' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('it')}
              >
                Công nghệ thông tin
              </button>
              <button
                type="button"
                className={`major-tab-btn ${selectedCategory === 'eng' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('eng')}
              >
                Kỹ thuật & Cơ điện tử
              </button>
              <button
                type="button"
                className={`major-tab-btn ${selectedCategory === 'build' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('build')}
              >
                Xây dựng & Thực phẩm
              </button>
              <button
                type="button"
                className={`major-tab-btn ${selectedCategory === 'biz' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('biz')}
              >
                Logistics & Quản lý
              </button>
            </div>
          </div>

          <div className="row g-4">
            {filteredMajors.map((major, idx) => (
              <div key={idx} className="col-md-6 col-lg-4">
                <div className="major-card">
                  <div>
                    <span className="major-code">Mã: {major.code}</span>
                    <h4 className="major-name">{major.name}</h4>
                    <p className="small text-muted mb-3">{major.desc}</p>
                    <div className="major-combos">
                      <strong>Tổ hợp môn:</strong> {major.combos}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="major-ask-btn"
                    onClick={() => handleAskQuestion(`Tư vấn tuyển sinh ngành ${major.name} (mã ${major.code})`)}
                  >
                    <i className="bi bi-robot"></i>
                    <span>Hỏi AI về ngành này</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. ABOUT UNIVERSITY SECTION */}
      <section id="gioi-thieu" className="section-wrapper bg-light-blue">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <div className="about-image-wrapper">
                <img
                  src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80"
                  alt="Giảng đường và sinh viên công nghệ"
                />
                <div className="about-badge-floating">
                  <div className="stat-icon text-primary bg-primary-subtle">
                    <i className="bi bi-award-fill"></i>
                  </div>
                  <div>
                    <div className="fw-bold fs-6">Trường Đại học Công lập</div>
                    <div className="small text-muted">Trực thuộc UBND Thành phố Cần Thơ</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <span className="section-pretitle">VỀ CHÚNG TÔI</span>
              <h2 className="section-title mb-4">
                Trường Đại Học Kỹ Thuật - Công Nghệ Cần Thơ (CTUT)
              </h2>
              <p className="text-secondary mb-4 leading-relaxed">
                Trường Đại học Kỹ thuật - Công nghệ Cần Thơ là cơ sở giáo dục đại học công lập đào tạo theo định hướng 
                ứng dụng hàng đầu tại khu vực Đồng bằng sông Cửu Long. Với sứ mệnh đào tạo nguồn nhân lực chất lượng cao 
                thuộc các khối ngành kỹ thuật, công nghệ, kinh tế công nghiệp phục vụ sự nghiệp công nghiệp hóa, hiện đại hóa đất nước.
              </p>

              <div className="about-check-item">
                <i className="bi bi-check-circle-fill about-check-icon"></i>
                <div>
                  <strong>Đội ngũ giảng viên tâm huyết:</strong> Giảng viên có học hàm Giáo sư, Phó Giáo sư, Tiến sĩ, Thạc sĩ được đào tạo bài bản từ các viện, trường đại học uy tín trong và ngoài nước.
                </div>
              </div>

              <div className="about-check-item">
                <i className="bi bi-check-circle-fill about-check-icon"></i>
                <div>
                  <strong>Cơ sở vật chất hiện đại:</strong> Phòng thí nghiệm, xưởng thực hành công nghệ ô tô, phòng Lab trí tuệ nhân tạo, tự động hóa và thư viện số đáp ứng tối đa nhu cầu học tập và nghiên cứu.
                </div>
              </div>

              <div className="about-check-item">
                <i className="bi bi-check-circle-fill about-check-icon"></i>
                <div>
                  <strong>Kết nối doanh nghiệp chặt chẽ:</strong> Sinh viên có cơ hội thực tập, trải nghiệm thực tế tại các tập đoàn công nghệ, doanh nghiệp lớn ngay từ năm thứ 2, thứ 3.
                </div>
              </div>

              <div className="mt-4 pt-2">
                <a
                  href="https://ctuet.edu.vn"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline-primary px-4 py-2 rounded-pill fw-semibold me-3"
                >
                  <i className="bi bi-globe me-2"></i>
                  Truy cập Website Nhà trường
                </a>
                <Link to="/chat" className="btn btn-primary px-4 py-2 rounded-pill fw-semibold">
                  <i className="bi bi-chat-text-fill me-2"></i>
                  Hỏi đáp Tuyển sinh
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. HOW TO USE IN 3 STEPS */}
      <section className="section-wrapper">
        <div className="container">
          <div className="section-title-wrap">
            <span className="section-pretitle">HƯỚNG DẪN SỬ DỤNG</span>
            <h2 className="section-title">Nhận Tư Vấn Nhanh Chỉ Với 3 Bước</h2>
            <p className="section-subtitle">
              Thao tác trực quan, dễ dàng cho cả học sinh và phụ huynh trên cả máy tính lẫn điện thoại.
            </p>
          </div>

          <div className="row g-4">
            <div className="col-md-4">
              <div className="step-card">
                <div className="step-number">1</div>
                <h4 className="step-title">Chọn hoặc Nhập Câu Hỏi</h4>
                <p className="step-text">
                  Nhập bất kỳ thắc mắc nào về phương thức xét tuyển, điểm chuẩn, hồ sơ học bạ hoặc ngành nghề bạn quan tâm.
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="step-card">
                <div className="step-number">2</div>
                <h4 className="step-title">AI Tra Cứu & Trích Xuất</h4>
                <p className="step-text">
                  Hệ thống AI tự động đối chiếu cơ sở dữ liệu đề án tuyển sinh chính thức của nhà trường đã được chuẩn hóa.
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="step-card">
                <div className="step-number">3</div>
                <h4 className="step-title">Nhận Kết Quả Tức Thì</h4>
                <p className="step-text">
                  Nhận ngay câu trả lời đầy đủ, chi tiết, kèm trích dẫn văn bản chính xác và hướng dẫn nộp hồ sơ cụ thể.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. CALL TO ACTION BANNER */}
      <section className="container mb-5">
        <div className="cta-banner-wrapper">
          <span className="badge bg-warning text-dark fw-bold px-3 py-2 mb-3 rounded-pill text-uppercase">
            <i className="bi bi-stars me-1"></i> Đồng hành cùng sĩ tử 2025
          </span>
          <h2 className="fs-1 fw-extrabold mb-3 text-white">
            Bạn Đang Cần Tư Vấn Tuyển Sinh Vào CTUT?
          </h2>
          <p className="fs-5 text-white-50 mb-4 mx-auto" style={{ maxWidth: '640px' }}>
            Đừng để bất kỳ băn khoăn nào làm chậm bước chân của bạn vào cánh cổng đại học. 
            Trợ lý AI luôn sẵn sàng lắng nghe và giải đáp 24/7!
          </p>
          <button
            type="button"
            className="cta-btn-large"
            onClick={() => handleAskQuestion('Xin chào! Em muốn được tư vấn tổng quan tuyển sinh năm nay.')}
          >
            <i className="bi bi-robot fs-5"></i>
            <span>Bắt Đầu Trò Chuyện Cùng AI Ngay</span>
          </button>
        </div>
      </section>

      {/* 10. SITE FOOTER */}
      <footer id="lien-he" className="site-footer">
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-5">
              <div className="d-flex align-items-center gap-3 mb-3">
                <img src={ctutLogo} alt="CTUT" style={{ width: '56px', height: '56px' }} />
                <div>
                  <h5 className="text-white fw-bold mb-0">TRƯỜNG ĐẠI HỌC KỸ THUẬT - CÔNG NGHỆ CẦN THƠ</h5>
                  <div className="text-warning small fw-semibold">CAN THO UNIVERSITY OF TECHNOLOGY</div>
                </div>
              </div>
              <p className="text-secondary small mb-3">
                Cơ sở giáo dục đại học công lập đào tạo nhân lực khoa học công nghệ, kỹ thuật chất lượng cao tại Thủ phủ Miền Tây sông nước Cần Thơ.
              </p>
              <div className="d-flex gap-2">
                <a
                  href="https://ctuet.edu.vn"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm btn-outline-light rounded-circle"
                  style={{ width: '36px', height: '36px', display: 'grid', placeContent: 'center' }}
                >
                  <i className="bi bi-globe"></i>
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm btn-outline-light rounded-circle"
                  style={{ width: '36px', height: '36px', display: 'grid', placeContent: 'center' }}
                >
                  <i className="bi bi-facebook"></i>
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm btn-outline-light rounded-circle"
                  style={{ width: '36px', height: '36px', display: 'grid', placeContent: 'center' }}
                >
                  <i className="bi bi-youtube"></i>
                </a>
              </div>
            </div>

            <div className="col-lg-3 col-md-6">
              <h5 className="footer-heading">Liên Kết Nhanh</h5>
              <ul className="footer-links">
                <li><Link to="/chat"><i className="bi bi-chevron-right"></i> Chatbot AI Tuyển sinh</Link></li>
                <li><a href="https://ctuet.edu.vn" target="_blank" rel="noreferrer"><i className="bi bi-chevron-right"></i> Cổng thông tin CTUT</a></li>
                <li><a href="https://daotao.ctuet.edu.vn" target="_blank" rel="noreferrer"><i className="bi bi-chevron-right"></i> Phòng Đào tạo</a></li>
                <li><a href="https://tuyensinh.ctuet.edu.vn" target="_blank" rel="noreferrer"><i className="bi bi-chevron-right"></i> Cổng tuyển sinh chính thức</a></li>
                <li><Link to="/login"><i className="bi bi-chevron-right"></i> Đăng nhập hệ thống</Link></li>
              </ul>
            </div>

            <div className="col-lg-4 col-md-6">
              <h5 className="footer-heading">Ban Tư Vấn Tuyển Sinh</h5>
              <div className="footer-contact-item">
                <i className="bi bi-geo-alt-fill"></i>
                <span>256 Nguyễn Văn Cừ, Phường An Hòa, Quận Ninh Kiều, TP. Cần Thơ</span>
              </div>
              <div className="footer-contact-item">
                <i className="bi bi-telephone-fill"></i>
                <span>Điện thoại: (0292) 3898 167 - (0292) 3894 050</span>
              </div>
              <div className="footer-contact-item">
                <i className="bi bi-phone-fill"></i>
                <span>Hotline/Zalo tuyển sinh: <strong>0948.571.577</strong></span>
              </div>
              <div className="footer-contact-item">
                <i className="bi bi-envelope-fill"></i>
                <span>Email: <a href="mailto:tuyensinh@ctuet.edu.vn" className="text-info">tuyensinh@ctuet.edu.vn</a></span>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
              <div>
                © 2025 - 2026 Trường Đại học Kỹ thuật - Công nghệ Cần Thơ (CTUT). All rights reserved.
              </div>
              <div className="text-muted small">
                Mã trường tuyển sinh: <strong>KCC</strong> | Phát triển với Gemini AI & RAG
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* 11. FLOATING AI ASSISTANT BUTTON */}
      <Link to="/chat" className="floating-ai-btn" title="Mở Trợ lý AI Tuyển sinh">
        <i className="bi bi-robot fs-5"></i>
        <span>Hỏi Đáp AI</span>
        <span className="floating-ai-badge">24/7</span>
      </Link>
    </div>
  );
}

