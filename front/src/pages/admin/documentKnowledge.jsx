import { useEffect, useRef, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { uploadFile, getRecentFiles } from "../../services/api/file";
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

  //recent file
  const [recentFiles, setRecentFiles] = useState([])

  useEffect(()=>{
    async function loadFiles() {
      const result= await getRecentFiles();
      setRecentFiles(result)

    }
    loadFiles()
  },[])


  const collectFiles = async (files) => {
    setUploadError("");
    const selectedFiles = Array.from(files);
    setUploadedNames(selectedFiles.map((file) => file.name));
    try {
      const result=await Promise.all(
        selectedFiles.map((file)=>uploadFile(file))
      );
    } catch (error) {
      setUploadError(error.message);
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
          <section className="processing-section">
            <h2>Đang xử lý ({processingFiles.length} tệp)</h2>
            <div className="processing-list">
              {processingFiles.map((file) => (
                <ProcessingFile key={file.name} {...file} />
              ))}
            </div>
          </section>

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
                        <span className="indexed">Đã lập chỉ mục</span>
                      </td>
                      <td>
                        <button aria-label={`Thao tác với ${file.original_filename}`}>
                          <i className="bi bi-three-dots" />
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

function ProcessingFile({ name, type, progress, label, accent }) {
  return (
    <article className="processing-file">
      <div className="processing-file-head">
        <span className={`document-type ${type}`}>
          <i
            className={`bi ${type === "pdf" ? "bi-file-earmark-pdf-fill" : "bi-file-earmark-spreadsheet-fill"}`}
          />
        </span>
        <strong>{name}</strong>
        <span className={`processing-label ${accent}`}>
          {accent === "amber" && <i className="bi bi-stars" />}
          {label}
        </span>
      </div>
      <div className="progress-track">
        <span className={accent} style={{ width: `${progress}%` }} />
      </div>
    </article>
  );
}
