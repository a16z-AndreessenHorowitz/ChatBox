import { useState, useRef } from 'react';
import './ChatInput.css';

export default function ChatInput({
  onSend,
  isLoading,
  embeddingStatus = '',
  embeddingProgress = null,
  showEmbeddingNotice = false,
}) {

  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e) => {
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
    setValue(ta.value);
  };

  const canSend = value.trim().length > 0 && !isLoading;

  return (
    <div className="input-bar">
      {(embeddingStatus || showEmbeddingNotice) && (
        <div className="embedding-notice">
          <p>
            {embeddingStatus || 'Lần đầu gửi câu hỏi, trình duyệt sẽ tải mô hình nhúng để tìm tài liệu liên quan.'}
          </p>
          {embeddingProgress && (
            <div className="embedding-progress" aria-live="polite">
              <div className="embedding-progress-track">
                <div
                  className="embedding-progress-fill"
                  style={{ width: `${embeddingProgress.percent}%` }}
                />
              </div>
              <span className="embedding-progress-value">
                {embeddingProgress.percent}%
                {embeddingProgress.total && embeddingProgress.loaded != null
                  ? ` - ${(embeddingProgress.loaded / 1024 / 1024).toFixed(1)} / ${(embeddingProgress.total / 1024 / 1024).toFixed(1)} MB`
                  : ''}
              </span>
            </div>
          )}
        </div>
      )}
      <div className="input-pill">
        <textarea
          ref={textareaRef}
          className="input-textarea"
          placeholder="Nhập câu hỏi về tuyển sinh..."
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isLoading}
        />
        <button
          className={`input-send-btn ${canSend ? 'can-send' : ''}`}
          onClick={handleSubmit}
          disabled={!canSend}
          title="Gửi"
        >
          {isLoading ? (
            <span className="spinner-border spinner-border-sm" role="status" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
