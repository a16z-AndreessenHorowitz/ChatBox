import { request } from './request';
import { getClientEmbedding } from '../embedding';

export async function sendMessage(
  message,
  session_id = null,
) {
  const embedding = await getClientEmbedding(message);
  const data = await request('/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, embedding, session_id }),
  });

  return {
    id: Date.now(),
    role: 'bot',
    timestamp: new Date().toISOString(),
    session_id: data.session_id,
    response: {
      type: 'markdown',
      answer: data.answer,
      sources: data.sources || [],
      hasAnswer: Boolean(data.answer),
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
