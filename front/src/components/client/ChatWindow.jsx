import { useState, useEffect, useRef } from 'react';
import './ChatWindow.css';
import MessageBubble from './MessageBubble.jsx';
import ChatInput from './ChatInput.jsx';
import ChatSidebar from './ChatSidebar.jsx';
import { initialMessages } from '../../mock/conversations.js';
import { sendMessage, getHistory } from '../../services/api/chat.js';
import AuthModal from './AuthModal.jsx';


export default function ChatWindow() {
  const [messages, setMessages] = useState(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [authStep, setAuthStep] = useState(null);
  const [user, setUser] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const email = localStorage.getItem('userEmail') || sessionStorage.getItem('userEmail');
    const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    if (email) {
      setUser({ id: userId ? Number(userId) : null, email, name: email.split('@')[0], initials: 'TS' });
    }
  }, []);

  useEffect(() => {
    async function loadChatHistory() {
      if (!activeId) return;
      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      if (!user || !token) return;
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
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const botMsg = await sendMessage(text, activeId, user?.id, user?.email);
      setMessages((prev) => [...prev, botMsg]);
      if (botMsg.session_id) {
        setActiveId(botMsg.session_id);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: 'bot',
          timestamp: new Date().toISOString(),
          response: {
            type: 'text',
            answer: 'Đã xảy ra lỗi. Vui lòng thử lại.',
            sources: [],
            hasAnswer: false,
          },
        },
      ]);
    } finally {
      setIsLoading(false);
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
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <ChatInput onSend={handleSend} isLoading={isLoading} />
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
