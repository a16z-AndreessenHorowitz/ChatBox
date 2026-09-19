import './MessageBubble.css';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="msg-row msg-row--user">
        <div className="bubble-user">{message.content}</div>
      </div>
    );
  }

  const { answer: rawAnswer = message.content ?? '', sources = [] } = message.response ?? {};
  const answer = String(rawAnswer ?? '').replace(/\\n/g, '\n');

  return (
    <div className="msg-row msg-row--bot">
      <div className="bot-msg-content">

        <div className="bot-text">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeSanitize]}
          >
            {answer}
          </ReactMarkdown>
        </div>

        <div className="bot-footer">
          {sources.map((src, i) => (
            <span key={i} className="source-pill">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              {src.documentName}
              {src.page != null && (
                <span className="source-pill-page">tr. {src.page}</span>
              )}
            </span>
          ))}

        </div>

      </div>
    </div>
  );
}
