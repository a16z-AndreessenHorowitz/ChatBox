import { useState, useEffect, useRef } from 'react';
import './ChatWindow.css';
import MessageBubble from './MessageBubble.jsx';
import ChatInput from './ChatInput.jsx';
import ChatSidebar from './ChatSidebar.jsx';
import { sendMessage, getHistory } from '../../services/api/chat.js';
import { isClientEmbeddingReady } from '../../services/embedding.js';
import AuthModal from './AuthModal.jsx';
import { useAuth } from '../../auth/AuthProvider.jsx';

  const initialMessages = [
  {
    id: 'welcome',
    role: 'bot',
    timestamp: new Date().toISOString(),
    response: {
      type: 'text',
      answer: 'Xin chào! Bạn muốn tìm hiểu thông tin tuyển sinh nào?',
      sources: [],
      hasAnswer: true,
    },
  },
];

export default function ChatWindow() {
  const [messages, setMessages] = useState(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [embeddingStatus, setEmbeddingStatus] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [authStep, setAuthStep] = useState(null);
  const [user, setUser] = useState(null);
  const { user: authUser } = useAuth();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => { setUser(authUser); }, [authUser]);

  useEffect(() => {
    async function loadChatHistory() {
      if (!activeId) return;
      if (!user) return;
      setIsLoading(true);
      try {
        const data = await getHistory(activeId);
        if (data && data.messages) {
          const mappedMessages = data.messages.map(m => {
            if (m.role === 'user') {
              return {
                id: m.id,
                role: 'user',
                content: m.content,
                timestamp: m.created_at
              };
            } else {
              return {
                id: m.id,
                role: 'bot',
                timestamp: m.created_at,
                response: {
                  type: 'markdown',
                  answer: m.content,
                  sources: m.sources || [],
                  hasAnswer: Boolean(m.content)
                }
              };
            }
          });
          setMessages(mappedMessages);
        }
      } catch (error) {
        console.error("Lỗi tải tin nhắn:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadChatHistory();
  }, [activeId, user]);

  const handleSend = async (text) => {
    if (!user) {
      setAuthStep('true');
      return;
    }

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setEmbeddingStatus(
      isClientEmbeddingReady()
        ? 'Đang tạo vector câu hỏi...'
        : 'Đang tải mô hình embedding lần đầu...',
    );
    const streamMessageId = Date.now() + 1;
    let streamSources = [];

    try {
      const botMsg = await sendMessage(text, activeId, (progress) => {
        if (progress.status === 'progress') {
          setEmbeddingStatus(
            `Đang tải ${progress.file || 'mô hình'}: ${Math.round(progress.progress || 0)}%`,
          );
        } else if (progress.status === 'done') {
          setEmbeddingStatus('Đang khởi tạo mô hình embedding...');
        } else if (progress.status === 'ready') {
          setEmbeddingStatus('Đang gửi vector lên máy chủ...');
        }
      }, (event) => {
        if (event.type === 'meta') {
          streamSources = event.sources || [];
          setEmbeddingStatus('Gemini đang tạo câu trả lời...');
          if (event.session_id) setActiveId(event.session_id);
        } else if (event.type === 'delta') {
          setMessages((prev) => {
            const existing = prev.find((message) => message.id === streamMessageId);
            if (existing) {
              return prev.map((message) => message.id === streamMessageId
                ? { ...message, response: { ...message.response, answer: `${message.response.answer}${event.text}` } }
                : message);
            }
            return [...prev, {
              id: streamMessageId,
              role: 'bot',
              timestamp: new Date().toISOString(),
              response: { type: 'markdown', answer: event.text, sources: streamSources, hasAnswer: true },
            }];
          });
        }
      });
      console.log('[Chat] Nhận response /chat thành công');
      setMessages((prev) => {
        const finalMessage = { ...botMsg, id: streamMessageId };
        return prev.some((message) => message.id === streamMessageId)
          ? prev.map((message) => message.id === streamMessageId ? finalMessage : message)
          : [...prev, finalMessage];
      });
      if (botMsg.session_id) {
        setActiveId(botMsg.session_id);
      }
    } catch (error) {
      console.error('[Chat] Gửi câu hỏi thất bại:', error);
      setMessages((prev) => [
        ...prev.filter((message) => message.id !== streamMessageId),
        {
          id: Date.now(),
          role: 'bot',
          timestamp: new Date().toISOString(),
          response: {
            type: 'text',
            answer: error.message || 'Đã xảy ra lỗi. Vui lòng thử lại.',
            sources: [],
            hasAnswer: false,
          },
        },
      ]);
    } finally {
      setIsLoading(false);
      setEmbeddingStatus('');
    }
  };

  const handleNewChat = () => {
    setMessages(initialMessages);
    setIsLoading(false);
    setActiveId(null);
  };


  return (
    <div className="app-shell">
      {/* Sidebar 30% */}
      <ChatSidebar
        onNewChat={handleNewChat}
        activeId={activeId}
        onSelectChat={setActiveId}
        user={user}
        onLogin={() => setAuthStep('true')}
      />

      {/* Chat panel 70% */}
      <main className="chat-panel">
        {/* Top label */}
        <div className="chat-panel-header">
          <span>Tư vấn tuyển sinh</span>
        </div>

        <div className="messages-scroll">
          <div className="messages-content">


            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Typing dots */}
            {isLoading && (
              <div className="typing-row">
                <div className="typing-dots">
                  <span /><span /><span />
                </div>
                {embeddingStatus && <span className="typing-status" role="status">{embeddingStatus}</span>}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
        />
      </main>

      {authStep && (
        <AuthModal
          onClose={() => setAuthStep(null)}
          onAuthenticated={(account) => {
            setUser(account);
            setAuthStep(null);
          }}
        />
      )}
    </div>
  );
}
