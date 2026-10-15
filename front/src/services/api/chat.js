import { request } from './request';

export async function sendMessage(
  message,
  session_id = null,
  user_id = null,
  account = null,
  query_vector = null,
) {
  const data = await request('/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, session_id, user_id, account, query_vector }),
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
