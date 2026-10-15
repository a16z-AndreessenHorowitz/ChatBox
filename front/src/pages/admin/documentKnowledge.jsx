import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  getDocumentDetail,
  getRecentFiles,
  updateDocumentMarkdown,
  uploadFile,
} from "../../services/api/file";
import "./documentKnowledge.css";

const processingFiles = [
  {
    name: "tuyen-sinh-2026-final-v3.pdf",
    type: "pdf",
    progress: 85,
    label: "Đang phân loại",
    accent: "amber",
  },
  {
    name: "scan_hocphi_khoaCNTT.xlsx",
    type: "xlsx",
    progress: 30,
    label: "Đang trích xuất dữ liệu",
    accent: "silver",
  },
];

// const recentFiles = [
//   ["Quy-che-tuyen-sinh-Bo-GD-2026.pdf", "✣ Quy chế", "3.8 MB"],
//   ["Nganh-Cong-nghe-thong-tin-2026.docx", "✣ Ngành đào tạo", "1.4 MB"],
//   ["file-cu-chua-ro-noi-dung.docx", "Chưa xác định", "620 KB"],
//   ["Hoc-bong-tan-sinh-vien-2026.pdf", "Học phí - học bổng", "2.1 MB"],
// ];

export default function DocumentKnowledge() {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedNames, setUploadedNames] = useState([]);
  const [uploadError, setUploadError] = useState("");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [markdownDraft, setMarkdownDraft] = useState("");
  const [detailError, setDetailError] = useState("");
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSavingMarkdown, setIsSavingMarkdown] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  //recent file
  const [recentFiles, setRecentFiles] = useState([])

  const loadRecentFiles = async () => {
    const result = await getRecentFiles();
    setRecentFiles(result);
  };

  useEffect(()=>{
    loadRecentFiles().catch((error) => setUploadError(error.message));
  },[])

// collectFiles(files) & onDrop
  const collectFiles = async (files) => {
    setUploadError("");
    const selectedFiles = Array.from(files);
    setUploadedNames(selectedFiles.map((file) => file.name));
    try {
      await Promise.all(
        selectedFiles.map((file)=>uploadFile(file))
      );
      await loadRecentFiles();
    } catch (error) {
      setUploadError(error.message);
    }
  };


  // openDocumentDetail(documentId
  const openDocumentDetail = async (documentId) => {
    setDetailError("");
    setSaveMessage("");
    setIsDetailLoading(true);
    try {
      const document = await getDocumentDetail(documentId);
      setSelectedDocument(document);
      setMarkdownDraft(document.markdown_content || "");
    } catch (error) {
      setDetailError(error.message);
    } finally {
      setIsDetailLoading(false);
    }
  };


// saveMarkdown()
  const saveMarkdown = async () => {
    if (!selectedDocument) return;

    setDetailError("");
    setSaveMessage("");
    setIsSavingMarkdown(true);
    try {
      const updatedDocument = await updateDocumentMarkdown(
        selectedDocument.id,
        markdownDraft,
      );
      setSelectedDocument(updatedDocument);
      setSaveMessage("Đã lưu nội dung Markdown.");
    } catch (error) {
      setDetailError(error.message);
    } finally {
      setIsSavingMarkdown(false);
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    collectFiles(event.dataTransfer.files);
  };


  return (
    <AdminLayout activePage="Kho tri thức">
      <div className="knowledge-page">
        <section className="knowledge-content">
          <header className="knowledge-intro">
            <p className="knowledge-kicker">KHO TRI THỨC</p>
            <h1>Tài liệu của bạn</h1>
            <p>
              Cứ tải lên — hệ thống sẽ tự đọc và phân loại, bạn chỉnh lại sau
              nếu cần.
            </p>
          </header>
          <div
            className={`knowledge-dropzone ${isDragging ? "is-dragging" : ""}`}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) =>
              event.key === "Enter" && inputRef.current?.click()
            }
          >
            <input
              ref={inputRef}
              type="file"
              hidden
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
              onChange={(event) => collectFiles(event.target.files)}
            />
            <div className="dropzone-inner">
              <i className="bi bi-cloud-arrow-up" />
              <strong>Kéo thả tệp vào đây hoặc bấm để chọn</strong>
              <span>
                PDF, DOCX, XLSX — tối đa 50MB mỗi tệp. Không cần chọn loại tài
                liệu, hệ thống sẽ tự nhận diện.
              </span>
            </div>
          </div>
          {uploadedNames.length > 0 && (
            <p className="upload-notice">
              <i className="bi bi-check-circle-fill" /> Đã thêm:{" "}
              {uploadedNames.join(", ")}
            </p>
          )}
          {uploadError && <p className="upload-notice">{uploadError}</p>}
          {(selectedDocument || isDetailLoading || detailError) && (
            <section className="document-detail-section">
              <div className="document-detail-head">
                <div>
                  <h2>Chi tiết tài liệu</h2>
                  <p>
                    {selectedDocument?.original_filename ||
                      "Đang tải nội dung tài liệu..."}
                  </p>
                </div>
                {selectedDocument && (
                  <button
                    className="close-detail-button"
                    type="button"
                    onClick={() => {
                      setSelectedDocument(null);
                      setMarkdownDraft("");
                      setDetailError("");
                      setSaveMessage("");
                    }}
                    aria-label="Đóng chi tiết tài liệu"
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                )}
              </div>
              {detailError && <p className="detail-message error">{detailError}</p>}
              {saveMessage && <p className="detail-message success">{saveMessage}</p>}
              {isDetailLoading ? (
                <div className="detail-loading">Đang tải chi tiết tài liệu...</div>
              ) : selectedDocument && (
                <div className="document-detail-grid">
                  <div className="pdf-panel">
                    <div className="panel-toolbar">
                      <strong>PDF gốc</strong>
                      <a
                        href={selectedDocument.secure_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <i className="bi bi-box-arrow-up-right" />
                        Mở file
                      </a>
                    </div>
                    <iframe
                      src={`${selectedDocument.secure_url}#toolbar=1&navpanes=0&view=FitH`}
                      title={`PDF ${selectedDocument.original_filename}`}
                    />
                  </div>
                  <div className="markdown-panel">
                    <div className="panel-toolbar">
                      <strong>Markdown</strong>
                      <button
                        type="button"
                        onClick={saveMarkdown}
                        disabled={isSavingMarkdown}
                      >
                        <i className="bi bi-save" />
                        {isSavingMarkdown ? "Đang lưu" : "Lưu chỉnh sửa"}
                      </button>
                    </div>
                    <textarea
                      value={markdownDraft}
                      onChange={(event) => setMarkdownDraft(event.target.value)}
                      placeholder="Nội dung Markdown sau khi xử lý sẽ hiển thị ở đây."
                    />
                    <div className="markdown-preview">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {markdownDraft || "_Chưa có nội dung Markdown._"}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}


          <section className="recent-section">
            <h2>Tài liệu gần đây</h2>
            <div className="recent-table-wrap">
              <table className="recent-table">
                <thead>
                  <tr>
                    <th>Tên tài liệu</th>
                    <th>Loại (AI gợi ý)</th>
                    <th>Kích thước</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {recentFiles.map((file) => (
                    <tr key={file.id}>
                      <td>{file.original_filename}</td>
                      <td>
                        <span
                          className={
                            file.category === "Chưa xác định"
                              ? "category unknown"
                              : "category"
                          }
                        >
                          {file.category}
                        </span>
                      </td>
                      <td>{file.file_size}</td>
                      <td>
                        <span className={`indexed ${file.status?.toLowerCase()}`}>
                          {file.status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => openDocumentDetail(file.id)}
                          aria-label={`Xem chi tiết ${file.original_filename}`}
                        >
                          <i className="bi bi-eye" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </section>
      </div>
    </AdminLayout>
  );
}


