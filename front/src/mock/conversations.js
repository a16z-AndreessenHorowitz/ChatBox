// Mock data theo đúng format backend trả ra
// Hiện tại chỉ dùng type: "text"

export const initialMessages = [
  {
    id: 1,
    role: 'bot',
    response: {
      type: 'text',
      answer: 'Xin chào! Tôi là trợ lý tư vấn tuyển sinh AI. Tôi có thể giúp bạn tìm hiểu về các ngành học, điểm chuẩn, học phí, học bổng và quy trình xét tuyển. Bạn muốn hỏi gì nào?',
      sources: [],
      hasAnswer: true,
    },
    timestamp: new Date().toISOString(),
  },
];

// Mock responses — keyword match → trả về object đúng format backend
export const mockResponses = [
  {
    keywords: ['công nghệ thông tin', 'cntt', 'it', 'lập trình'],
    response: {
      type: 'text',
      answer: 'Ngành Công nghệ thông tin đào tạo trong 4 năm, học phí khoảng 20–35 triệu đồng/năm tùy trường. Tổ hợp xét tuyển phổ biến là A00 (Toán, Lý, Hóa) và A01 (Toán, Lý, Anh). Điểm chuẩn năm 2024 dao động từ 24.5 đến 27.0 điểm tùy trường. Nhiều trường có học bổng 50–100% học phí cho sinh viên xuất sắc.',
      sources: [
        { documentName: 'Đề án tuyển sinh 2024 – ĐH Bách Khoa HN', page: 12 },
        { documentName: 'Thống kê điểm chuẩn CNTT 2020–2024', page: 5 },
      ],
      hasAnswer: true,
    },
  },
  {
    keywords: ['y khoa', 'bác sĩ', 'y dược', 'dược'],
    response: {
      type: 'text',
      answer: 'Ngành Y khoa và Dược là ngành đặc thù với yêu cầu đầu vào cao. Tổ hợp xét tuyển là B00 (Toán, Hóa, Sinh). Điểm chuẩn năm 2024 từ 26.0 đến 29.5 điểm. Thời gian đào tạo 6 năm với Y khoa và 5 năm với Dược. Học phí khoảng 25–50 triệu/năm. Lưu ý: thí sinh cần đáp ứng yêu cầu sức khỏe theo quy định của Bộ Y tế.',
      sources: [
        { documentName: 'Quy chế tuyển sinh ngành Y 2024 – Bộ GD&ĐT', page: 8 },
        { documentName: 'Đề án tuyển sinh ĐH Y Hà Nội 2024', page: 3 },
      ],
      hasAnswer: true,
    },
  },
  {
    keywords: ['kinh tế', 'kinh doanh', 'quản trị', 'tài chính', 'kế toán'],
    response: {
      type: 'text',
      answer: 'Nhóm ngành Kinh tế – Quản trị rất đa dạng và phù hợp với nhiều định hướng nghề nghiệp. Tổ hợp xét tuyển phổ biến: A00, A01, D01 (Toán, Văn, Anh). Điểm chuẩn 2024 từ 22.0 đến 26.5 điểm. Học phí 18–40 triệu/năm. Cơ hội việc làm rộng tại ngân hàng, tài chính, doanh nghiệp tư nhân và startup.',
      sources: [
        { documentName: 'Báo cáo thị trường lao động Q1/2024', page: 18 },
        { documentName: 'Đề án tuyển sinh NEU 2024', page: 7 },
      ],
      hasAnswer: true,
    },
  },
  {
    keywords: ['luật', 'pháp lý', 'tư pháp'],
    response: {
      type: 'text',
      answer: 'Ngành Luật ngày càng được quan tâm trong bối cảnh hội nhập kinh tế quốc tế. Tổ hợp xét tuyển: C00 (Văn, Sử, Địa), D01, A01. Điểm chuẩn 2024 từ 23.5 đến 26.0 điểm. Thời gian đào tạo 4 năm. Sau tốt nghiệp có thể làm luật sư, thẩm phán, công chứng viên hoặc pháp chế doanh nghiệp.',
      sources: [
        { documentName: 'Đề án tuyển sinh ĐH Luật HN 2024', page: 2 },
      ],
      hasAnswer: true,
    },
  },
  {
    keywords: ['học bổng', 'hỗ trợ tài chính'],
    response: {
      type: 'text',
      answer: 'Có 4 loại học bổng phổ biến năm 2024. Thứ nhất là học bổng tuyển thẳng/điểm cao (50–100% học phí) dành cho thủ khoa và học sinh giỏi quốc gia. Thứ hai là học bổng duy trì theo GPA mỗi học kỳ (thường từ 3.2/4.0 trở lên). Thứ ba là học bổng doanh nghiệp như Samsung, Vingroup, VNPT tài trợ 10–20 triệu/năm. Thứ tư là học bổng ưu tiên cho thí sinh có IELTS từ 6.5 trở lên.',
      sources: [
        { documentName: 'Tổng hợp học bổng đại học 2024 – Cổng TTTT Bộ GD&ĐT', page: 3 },
      ],
      hasAnswer: true,
    },
  },
  {
    keywords: ['điểm chuẩn', 'điểm đầu vào'],
    response: {
      type: 'text',
      answer: 'Điểm chuẩn 2024 một số ngành tiêu biểu: Y khoa ĐH Y HN đạt 29.45 điểm, CNTT ĐH Bách Khoa HN đạt 27.10 điểm, Luật ĐH Luật HN đạt 26.00 điểm, Kinh tế NEU đạt 26.50 điểm, Kiến trúc ĐH Kiến trúc HN đạt 24.00 điểm. Lưu ý điểm chuẩn thay đổi hàng năm theo số lượng thí sinh và chỉ tiêu.',
      sources: [
        { documentName: 'Công bố điểm chuẩn 2024 – Bộ GD&ĐT', page: 1 },
      ],
      hasAnswer: true,
    },
  },
];

// Fallback khi không match keyword nào
export const fallbackResponse = {
  type: 'text',
  answer: 'Xin lỗi, mình chưa tìm thấy thông tin phù hợp trong kho dữ liệu tuyển sinh về câu hỏi này. Bạn có thể thử hỏi về: ngành học, điểm chuẩn, học phí, học bổng, hoặc tổ hợp xét tuyển. Ngoài ra bạn có thể liên hệ trực tiếp phòng tuyển sinh để được hỗ trợ.',
  sources: [],
  hasAnswer: false,
};
