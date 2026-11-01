import { request, requestRaw } from './request';
import { getClientEmbedding } from '../embedding';

export async function sendMessage(
  message,
  session_id = null,
  onEmbeddingProgress,
  onStreamEvent,
) {
  const embedding = await getClientEmbedding(message, onEmbeddingProgress);
  onEmbeddingProgress?.({ status: 'ready' });
  const response = await requestRaw('/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, embedding, session_id }),
  });

  //chỗ đọc streaming
  if (!response.body) throw new Error('Trình duyệt không hỗ trợ nhận câu trả lời dạng streaming.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let meta = null;
  let answer = '';
  let completed = false;

  //chỗ xử lý từng phần câu trả lời
  const processFrame = (frame) => {
    const dataLine = frame.split('\n').find((line) => line.startsWith('data:'));
    if (!dataLine) return;
    const event = JSON.parse(dataLine.slice(5).trim());
    if (event.type === 'meta') meta = event;
    if (event.type === 'delta') answer += event.text;
    if (event.type === 'done') completed = true;
    onStreamEvent?.(event);
    if (event.type === 'error') throw new Error(event.message || 'Không thể tạo câu trả lời.');
  };

  try {
    //nơi nhận dữ liệu liên tục
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const frames = buffer.split('\n\n');
      buffer = frames.pop() || '';
      frames.forEach(processFrame);
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }

  if (!completed) throw new Error('Kết nối streaming bị gián đoạn. Vui lòng thử lại.');

  return {
    id: Date.now(),
    role: 'bot',
    timestamp: new Date().toISOString(),
    session_id: meta?.session_id,
    response: {
      type: 'markdown',
      answer,
      sources: meta?.sources || [],
      hasAnswer: Boolean(answer),
    },
  };
}

export async function getHistory(session_id) {
  const data = await request(`/chat/history/${session_id}`, {
    method: 'GET',
  });

  return data;
}

export async function getSessions() {
  const data = await request(`/chat/sessions`, {
    method: 'GET',
  });

  return data;
}
