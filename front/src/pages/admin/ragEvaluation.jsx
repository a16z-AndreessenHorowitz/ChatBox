import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { getClientEmbedding } from "../../services/embedding";
import {
  approveEvaluationQuestion,
  deleteEvaluationQuestion,
  generateEvaluationQuestions,
  getEvaluationRun,
  getEvaluationQuestion,
  getEvaluationQuestions,
  getEvaluationDocuments,
  getEvaluationRuns,
  startEvaluationRun,
  updateEvaluationQuestion,
} from "../../services/api/evaluation";
import "./ragEvaluation.css";

const tabs = [
  ["all", "Tất cả"],
  ["draft", "Bản nháp"],
  ["approved", "Đã duyệt"],
];

export default function RagEvaluation() {
  const [questions, setQuestions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [runs, setRuns] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [workingQuestionId, setWorkingQuestionId] = useState(null);
  const [startingRun, setStartingRun] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [loadingRunDetail, setLoadingRunDetail] = useState(false);

  const refreshRuns = useCallback(async () => {
    const result = await getEvaluationRuns();
    setRuns(result);
    return result;
  }, []);

  const loadData = useCallback(async () => {
    setPageError("");
    setLoading(true);
    const [questionResult, documentResult, runResult] = await Promise.allSettled([
      getEvaluationQuestions(),
      getEvaluationDocuments(),
      getEvaluationRuns(),
    ]);
    if (questionResult.status === "fulfilled") {
      setQuestions(questionResult.value);
    } else {
      setPageError(questionResult.reason?.message || "Không tải được bộ câu hỏi.");
    }
    if (documentResult.status === "fulfilled") {
      setDocuments(Array.isArray(documentResult.value) ? documentResult.value : []);
    } else if (questionResult.status === "fulfilled") {
      setPageError(documentResult.reason?.message || "Không tải được danh sách tài liệu.");
    }
    if (runResult.status === "fulfilled") {
      setRuns(runResult.value);
    } else if (questionResult.status === "fulfilled" && documentResult.status === "fulfilled") {
      setPageError(runResult.reason?.message || "Không tải được lịch sử đánh giá.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const readyDocuments = useMemo(
    () => documents.filter((document) => document.status?.toUpperCase() === "READY"),
    [documents],
  );
  const visibleQuestions = useMemo(
    () => activeTab === "all" ? questions : questions.filter((item) => item.status === activeTab),
    [activeTab, questions],
  );
  const draftCount = questions.filter((item) => item.status === "draft").length;
  const approvedCount = questions.filter((item) => item.status === "approved").length;
  const latestRun = runs[0] || null;
  const hasActiveRun = runs.some((run) => ["queued", "running"].includes(run.status));

  useEffect(() => {
    if (!hasActiveRun) return undefined;
    const timer = window.setInterval(() => refreshRuns().catch(() => {}), 2500);
    return () => window.clearInterval(timer);
  }, [hasActiveRun, refreshRuns]);

  useEffect(() => {
    if (!selectedRun || !["queued", "running"].includes(selectedRun.status)) return undefined;
    let active = true;
    const timer = window.setInterval(async () => {
      try {
        const detail = await getEvaluationRun(selectedRun.id);
        if (active) setSelectedRun(detail);
      } catch {
        // Keep showing the latest snapshot if a refresh fails.
      }
    }, 2500);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [selectedRun?.id, selectedRun?.status]);

  const startRun = async () => {
    setStartingRun(true);
    setNotice(null);
    try {
      const run = await startEvaluationRun();
      await refreshRuns();
      setNotice({ type: "success", text: `Đã tạo lần đánh giá #${run.id}. Kết quả sẽ cập nhật khi job chạy xong.` });
      const detail = await getEvaluationRun(run.id);
      setSelectedRun(detail);
    } catch (error) {
      setNotice({ type: "error", text: error.message || "Không thể bắt đầu đánh giá." });
    } finally {
      setStartingRun(false);
    }
  };

  const openRun = async (runId) => {
    setSelectedRun(null);
    setLoadingRunDetail(true);
    try {
      setSelectedRun(await getEvaluationRun(runId));
    } catch (error) {
      setNotice({ type: "error", text: error.message || "Không tải được kết quả đánh giá." });
    } finally {
      setLoadingRunDetail(false);
    }
  };

  const openQuestionEditor = async (questionId) => {
    setWorkingQuestionId(questionId);
    try {
      setEditingQuestion(await getEvaluationQuestion(questionId));
    } catch (error) {
      setNotice({ type: "error", text: error.message || "Không tải được câu hỏi." });
    } finally {
      setWorkingQuestionId(null);
    }
  };

  const generateCandidates = async (event) => {
    event.preventDefault();
    if (!selectedDocumentId) return;
    setGenerating(true);
    setNotice(null);
    try {
      const created = await generateEvaluationQuestions(selectedDocumentId, questionCount);
      const updatedQuestions = await getEvaluationQuestions();
      setQuestions(updatedQuestions);
      setActiveTab("draft");
      setShowGenerate(false);
      setNotice({
        type: "success",
        text: `Gemini đã tạo ${created.length} câu hỏi nháp. Hãy kiểm tra đáp án và nguồn trước khi duyệt.`,
      });
    } catch (error) {
      setNotice({ type: "error", text: error.message || "Không sinh được câu hỏi." });
    } finally {
      setGenerating(false);
    }
  };

  const saveDraft = async (event) => {
    event.preventDefault();
    if (!editingQuestion) return;
    setSavingQuestion(true);
    setNotice(null);
    try {
      await updateEvaluationQuestion(
        editingQuestion.id,
        editingQuestion.question,
        editingQuestion.expected_answer,
      );
      setEditingQuestion(null);
      setNotice({ type: "success", text: "Đã lưu thay đổi cho câu hỏi nháp." });
      await loadData();
    } catch (error) {
      setNotice({ type: "error", text: error.message || "Không lưu được câu hỏi." });
    } finally {
      setSavingQuestion(false);
    }
  };

  const approveQuestion = async (item) => {
    setWorkingQuestionId(item.id);
    setNotice(null);
    try {
      setNotice({ type: "info", text: "Đang tạo vector embedding phía client..." });
      const embedding = await getClientEmbedding(item.question);
      await approveEvaluationQuestion(item.id, embedding);
      setNotice({
        type: "success",
        text: "Đã tạo vector và duyệt câu hỏi thành công. Câu này sẵn sàng đưa vào lần đánh giá.",
      });
      await loadData();
    } catch (error) {
      setNotice({ type: "error", text: error.message || "Không duyệt được câu hỏi." });
    } finally {
      setWorkingQuestionId(null);
    }
  };

  const removeQuestion = async (item) => {
    if (!window.confirm("Xóa câu hỏi nháp này?")) return;
    setWorkingQuestionId(item.id);
    setNotice(null);
    try {
      await deleteEvaluationQuestion(item.id);
      setQuestions((current) => current.filter((question) => question.id !== item.id));
      setNotice({ type: "success", text: "Đã xóa câu hỏi nháp." });
    } catch (error) {
      setNotice({ type: "error", text: error.message || "Không xóa được câu hỏi." });
    } finally {
      setWorkingQuestionId(null);
    }
  };

  return (
    <AdminLayout activePage="Đánh giá RAG">
      <div className="rag-eval-page">
        <div className="rag-eval-heading">
          <div>
            <p className="rag-eval-eyebrow">CHẤT LƯỢNG TRỢ LÝ AI</p>
            <h1>Đánh giá RAG</h1>
            <p className="rag-eval-subtitle">
              Sinh câu hỏi từ tài liệu, duyệt đáp án chuẩn và xây dựng bộ kiểm thử cho RAG.
            </p>
          </div>
          <div className="rag-eval-actions">
            <button
              className="rag-eval-button secondary"
              type="button"
              onClick={() => {
                setNotice(null);
                setSelectedDocumentId(readyDocuments[0]?.id ? String(readyDocuments[0].id) : "");
                setShowGenerate(true);
              }}
              disabled={!readyDocuments.length}
              title={!readyDocuments.length ? "Cần có tài liệu trạng thái READY trong kho tri thức" : undefined}
            >
              <i className="bi bi-stars" /> Sinh câu hỏi ứng viên
            </button>
            <button
              className="rag-eval-button primary"
              type="button"
              onClick={startRun}
              disabled={!approvedCount || startingRun || hasActiveRun}
              title={!approvedCount ? "Duyệt ít nhất một câu hỏi trước" : hasActiveRun ? "Đang có lần đánh giá chạy" : undefined}
            >
              {startingRun || hasActiveRun ? <span className="button-spinner" /> : <i className="bi bi-play-fill" />}
              {startingRun ? "Đang khởi chạy…" : hasActiveRun ? "Đang đánh giá…" : "Chạy đánh giá"}
            </button>
          </div>
        </div>

        {notice && (
          <div className={`rag-eval-feedback ${notice.type}`} role="status">
            <i className={`bi ${notice.type === "success" ? "bi-check-circle" : "bi-exclamation-circle"}`} />
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Đóng thông báo">
              <i className="bi bi-x-lg" />
            </button>
          </div>
        )}
        {pageError && <div className="rag-eval-feedback error" role="alert">{pageError}</div>}

        <section className="rag-eval-summary" aria-label="Tổng quan bộ câu hỏi">
          <SummaryCard icon="bi-collection" label="Tổng câu hỏi" value={loading ? "…" : questions.length} tone="violet" />
          <SummaryCard icon="bi-pencil-square" label="Bản nháp chờ duyệt" value={loading ? "…" : draftCount} tone="amber" />
          <SummaryCard icon="bi-check2-circle" label="Câu hỏi đã duyệt" value={loading ? "…" : approvedCount} tone="green" />
          <SummaryCard icon="bi-clock-history" label="Lần đánh giá gần nhất" value={latestRun ? runStatusLabel(latestRun.status) : "Chưa có"} tone="blue" />
        </section>

        <section className="rag-eval-panel">
          <div className="rag-eval-panel-head">
            <div>
              <h2>Bộ câu hỏi kiểm thử</h2>
              <p>Duyệt câu hỏi và đáp án chuẩn trước khi đưa vào lần đánh giá.</p>
            </div>
            <div className="rag-eval-panel-tools">
              <button className="rag-eval-refresh" type="button" onClick={loadData} disabled={loading}>
                <i className={`bi bi-arrow-clockwise ${loading ? "spinning" : ""}`} /> Làm mới
              </button>
            </div>
          </div>
          <div className="rag-eval-tabs" role="tablist" aria-label="Lọc trạng thái câu hỏi">
            {tabs.map(([id, label]) => {
              const count = id === "all" ? questions.length : questions.filter((item) => item.status === id).length;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === id}
                  className={activeTab === id ? "active" : ""}
                  onClick={() => setActiveTab(id)}
                >
                  {label}<span>{loading ? "…" : count}</span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="rag-eval-list-state"><span className="eval-spinner" /> Đang tải bộ câu hỏi…</div>
          ) : visibleQuestions.length ? (
            <div className="rag-eval-question-list">
              {visibleQuestions.map((item) => (
                <QuestionCard
                  key={item.id}
                  item={item}
                  busy={workingQuestionId === item.id}
                  onEdit={() => openQuestionEditor(item.id)}
                  onApprove={() => approveQuestion(item)}
                  onDelete={() => removeQuestion(item)}
                />
              ))}
            </div>
          ) : (
            <div className="rag-eval-empty">
              <div className="empty-illustration"><i className="bi bi-file-earmark-question" /></div>
              <h3>{activeTab === "all" ? "Chưa có câu hỏi kiểm thử" : activeTab === "draft" ? "Không có bản nháp chờ duyệt" : "Chưa có câu hỏi được duyệt"}</h3>
              <p>
                {activeTab === "approved"
                  ? "Duyệt câu hỏi nháp sau khi đã kiểm tra nội dung, đáp án và chunks nguồn."
                  : "Sinh câu hỏi từ tài liệu đã xử lý trong kho tri thức. Câu hỏi mới sẽ được lưu ở trạng thái bản nháp."}
              </p>
              {activeTab !== "approved" && (
                <button className="rag-eval-button secondary" type="button" onClick={() => setShowGenerate(true)} disabled={!readyDocuments.length}>
                  <i className="bi bi-stars" /> Sinh câu hỏi ứng viên
                </button>
              )}
            </div>
          )}
        </section>

        <section className="rag-eval-run-info">
          <div className="run-info-icon"><i className="bi bi-shield-check" /></div>
          <div>
            <h2>Quy trình đánh giá</h2>
            <p>
              Mỗi lần chạy dùng snapshot các câu đã duyệt. Hệ thống lưu câu trả lời, chunks truy xuất,
              điểm faithfulness, correctness và retrieval để bạn xem lại.
            </p>
          </div>
          <span className={`run-status ${latestRun?.status || "empty"}`}><i /> {latestRun ? runStatusLabel(latestRun.status) : "Chưa có lần chạy"}</span>
        </section>

        <section className="rag-eval-panel rag-eval-runs-panel">
          <div className="rag-eval-panel-head">
            <div><h2>Lịch sử đánh giá</h2><p>Mỗi lần chạy được lưu riêng để so sánh và xem lỗi theo câu.</p></div>
            <span className="runs-count">{runs.length} lần chạy</span>
          </div>
          {runs.length ? (
            <div className="eval-runs-list">
              {runs.map((run) => (
                <button className="eval-run-row" type="button" key={run.id} onClick={() => openRun(run.id)}>
                  <span className={`run-indicator ${run.status}`}><i className={`bi ${run.status === "completed" ? "bi-check2" : ["queued", "running"].includes(run.status) ? "bi-arrow-repeat" : "bi-exclamation"}`} /></span>
                  <span className="eval-run-main"><strong>Lần đánh giá #{run.id}</strong><small>{formatDate(run.created_at)} · {run.total_questions} câu hỏi</small></span>
                  <span className="eval-run-score">Faithfulness <b>{formatScore(run.average_scores?.faithfulness)}</b></span>
                  <span className="eval-run-score">Correctness <b>{formatScore(run.average_scores?.correctness)}</b></span>
                  <span className={`eval-run-status ${run.status}`}>{runStatusLabel(run.status)}</span>
                  <i className="bi bi-chevron-right run-chevron" />
                </button>
              ))}
            </div>
          ) : (
            <div className="runs-empty">Chưa có lần đánh giá. Duyệt một hoặc nhiều câu hỏi rồi bấm “Chạy đánh giá”.</div>
          )}
        </section>
      </div>

      {showGenerate && (
        <div className="eval-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowGenerate(false)}>
          <form className="eval-modal" role="dialog" aria-modal="true" aria-labelledby="generate-title" onSubmit={generateCandidates}>
            <div className="eval-modal-head">
              <div className="modal-icon"><i className="bi bi-stars" /></div>
              <button type="button" className="modal-close" onClick={() => setShowGenerate(false)} aria-label="Đóng"><i className="bi bi-x-lg" /></button>
              <h2 id="generate-title">Sinh câu hỏi ứng viên</h2>
              <p>Gemini đọc chunks của tài liệu đã xử lý và tạo câu hỏi cùng đáp án nháp.</p>
            </div>
            <label className="eval-field">
              <span>Tài liệu nguồn</span>
              <select value={selectedDocumentId} onChange={(event) => setSelectedDocumentId(event.target.value)} required>
                <option value="">Chọn tài liệu đã xử lý</option>
                {readyDocuments.map((document) => (
                  <option value={document.id} key={document.id}>{document.original_filename}</option>
                ))}
              </select>
            </label>
            {!readyDocuments.length && <p className="eval-field-hint">Chưa có tài liệu READY. Hãy xử lý tài liệu trong Kho tri thức trước.</p>}
            <label className="eval-field">
              <span>Số câu muốn sinh</span>
              <input type="number" min="1" max="20" value={questionCount} onChange={(event) => setQuestionCount(event.target.value)} required />
              <small>Gemini có thể sinh ít hơn nếu nội dung tài liệu không đủ thông tin.</small>
            </label>
            <div className="eval-modal-actions">
              <button type="button" className="rag-eval-button secondary" onClick={() => setShowGenerate(false)} disabled={generating}>Hủy</button>
              <button type="submit" className="rag-eval-button primary" disabled={generating || !selectedDocumentId}>
                {generating ? <><span className="button-spinner" /> Đang sinh câu hỏi…</> : <><i className="bi bi-stars" /> Bắt đầu sinh</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingQuestion && (
        <div className="eval-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setEditingQuestion(null)}>
          <form className="eval-modal eval-edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-title" onSubmit={saveDraft}>
            <div className="eval-modal-head">
              <button type="button" className="modal-close" onClick={() => setEditingQuestion(null)} aria-label="Đóng"><i className="bi bi-x-lg" /></button>
              <p className="rag-eval-eyebrow">CHỈNH SỬA BẢN NHÁP</p>
              <h2 id="edit-title">Kiểm tra câu hỏi và đáp án</h2>
            </div>
            <label className="eval-field">
              <span>Câu hỏi</span>
              <textarea rows="3" value={editingQuestion.question} onChange={(event) => setEditingQuestion({ ...editingQuestion, question: event.target.value })} required />
            </label>
            <label className="eval-field">
              <span>Đáp án chuẩn</span>
              <textarea rows="5" value={editingQuestion.expected_answer || ""} onChange={(event) => setEditingQuestion({ ...editingQuestion, expected_answer: event.target.value })} required />
            </label>
            <div className="eval-source-list">
              <strong><i className="bi bi-link-45deg" /> Chunks nguồn ({editingQuestion.sources?.length || 0})</strong>
              {editingQuestion.sources?.length ? editingQuestion.sources.map((source) => (
                <details key={source.chunk_id}>
                  <summary>{source.document_name} · chunk {source.chunk_index + 1}</summary>
                  <p>{source.content}</p>
                </details>
              )) : <p className="eval-no-source">Không có chunk nguồn.</p>}
            </div>
            <div className="eval-modal-actions">
              <button type="button" className="rag-eval-button secondary" onClick={() => setEditingQuestion(null)} disabled={savingQuestion}>Hủy</button>
              <button type="submit" className="rag-eval-button primary" disabled={savingQuestion}>
                {savingQuestion ? <><span className="button-spinner" /> Đang lưu…</> : <><i className="bi bi-save" /> Lưu bản nháp</>}
              </button>
            </div>
          </form>
        </div>
      )}
      {(loadingRunDetail || selectedRun) && (
        <div className="eval-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelectedRun(null)}>
          {loadingRunDetail ? (
            <div className="eval-modal run-loading"><span className="eval-spinner" /> Đang tải kết quả…</div>
          ) : selectedRun && <RunDetail run={selectedRun} onClose={() => setSelectedRun(null)} />}
        </div>
      )}
    </AdminLayout>
  );
}

function QuestionCard({ item, busy, onEdit, onApprove, onDelete }) {
  const isDraft = item.status === "draft";
  return (
    <article className="eval-question-card">
      <div className="question-card-top">
        <div className="question-card-meta">
          <span className={`eval-status ${item.status}`}><i className={`bi ${isDraft ? "bi-pencil" : "bi-check2"}`} />{isDraft ? "Bản nháp" : "Đã duyệt"}</span>
          <span className="question-document"><i className="bi bi-file-earmark-text" />{item.source_document_name || "Tài liệu đã xóa"}</span>
          <time>{formatDate(item.created_at)}</time>
        </div>
        <span className="question-id">#{item.id}</span>
      </div>
      <h3>{item.question}</h3>
      <div className="question-answer"><strong>Đáp án chuẩn</strong><p>{item.expected_answer || "Chưa có đáp án — hãy bổ sung trước khi duyệt."}</p></div>
      <div className="question-card-bottom">
        <span className="source-count"><i className="bi bi-paperclip" />{item.sources?.length || 0} chunks nguồn</span>
        {isDraft ? (
          <div className="question-actions">
            <button type="button" className="question-action subtle" onClick={onDelete} disabled={busy}><i className="bi bi-trash3" /> Xóa</button>
            <button type="button" className="question-action edit" onClick={onEdit} disabled={busy}><i className="bi bi-pencil-square" /> Chỉnh sửa</button>
            <button type="button" className="question-action approve" onClick={onApprove} disabled={busy || !item.expected_answer?.trim()} title={!item.expected_answer?.trim() ? "Bổ sung đáp án chuẩn trước khi duyệt" : undefined}>
              {busy ? <span className="button-spinner" /> : <i className="bi bi-check2" />} Duyệt
            </button>
          </div>
        ) : (
          <span className="approved-date">Duyệt {formatDate(item.approved_at)}</span>
        )}
      </div>
    </article>
  );
}

function SummaryCard({ icon, label, value, tone }) {
  return (
    <article className="rag-eval-summary-card">
      <span className={`summary-icon ${tone}`}><i className={`bi ${icon}`} /></span>
      <div><p>{label}</p><strong>{value}</strong></div>
    </article>
  );
}

function RunDetail({ run, onClose }) {
  const scores = run.average_scores || {};
  return (
    <section className="eval-modal eval-run-detail" role="dialog" aria-modal="true" aria-labelledby="run-detail-title">
      <div className="eval-modal-head">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng"><i className="bi bi-x-lg" /></button>
        <p className="rag-eval-eyebrow">KẾT QUẢ ĐÁNH GIÁ</p>
        <h2 id="run-detail-title">Lần đánh giá #{run.id}</h2>
        <p>{formatDate(run.created_at)} · {run.completed_count}/{run.total_questions} câu đã chấm · {runStatusLabel(run.status)}</p>
      </div>
      <div className="run-score-grid">
        <ScoreCard label="Faithfulness" score={scores.faithfulness} help="Câu trả lời được chunks hỗ trợ" />
        <ScoreCard label="Correctness" score={scores.correctness} help="Khớp đáp án chuẩn" />
        <ScoreCard label="Retrieval" score={scores.retrieval} help="Chunks có thông tin cần thiết" />
      </div>
      {run.error_message && <div className="rag-eval-feedback error">{run.error_message}</div>}
      <div className="run-result-list">
        {run.results?.length ? run.results.map((result) => (
          <article className="run-result-card" key={result.id}>
            <div className="run-result-heading"><strong>{result.question}</strong><span className={`eval-status ${result.status === "completed" ? "approved" : "draft"}`}>{result.status === "completed" ? "Đã chấm" : "Lỗi"}</span></div>
            {result.error_message ? <p className="run-result-error">{result.error_message}</p> : (
              <>
                <div className="run-result-scores">
                  <ScorePill label="Faithfulness" score={result.faithfulness_score} />
                  <ScorePill label="Correctness" score={result.correctness_score} />
                  <ScorePill label="Retrieval" score={result.retrieval_score} />
                  {result.response_time_ms != null && <span>{(result.response_time_ms / 1000).toFixed(1)} giây</span>}
                </div>
                <details><summary>Câu trả lời và lý do chấm</summary>
                  <h4>Câu trả lời RAG</h4><p>{result.answer || "Không có câu trả lời."}</p>
                  <h4>Đáp án chuẩn</h4><p>{result.expected_answer}</p>
                  <div className="judge-reasons">
                    {[["Faithfulness", "faithfulness"], ["Correctness", "correctness"], ["Retrieval", "retrieval"]].map(([label, key]) => (
                      <p key={key}><strong>{label}:</strong> {result.reasons?.[key] || "Chưa có nhận xét."}</p>
                    ))}
                  </div>
                  <h4>Chunks đã truy xuất ({result.retrieved_contexts?.length || 0})</h4>
                  {result.retrieved_contexts?.map((context, index) => <p className="retrieved-context" key={`${index}-${context.document}`}><strong>{context.document}</strong><br />{context.content}</p>)}
                </details>
              </>
            )}
          </article>
        )) : <div className="runs-empty">Job đang chờ xử lý hoặc chưa có kết quả.</div>}
      </div>
    </section>
  );
}

function ScoreCard({ label, score, help }) {
  return <div className="run-score-card"><strong>{formatScore(score)}</strong><span>{label}</span><small>{help}</small></div>;
}

function ScorePill({ label, score }) {
  return <span>{label} <b>{formatScore(score)}</b></span>;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(date);
}

function formatScore(value) {
  return value == null ? "—" : `${Math.round(value * 100)}%`;
}

function runStatusLabel(status) {
  return ({
    queued: "Đang chờ",
    running: "Đang chạy",
    completed: "Hoàn tất",
    completed_with_errors: "Hoàn tất có lỗi",
    failed: "Thất bại",
  })[status] || "Chưa có";
}
