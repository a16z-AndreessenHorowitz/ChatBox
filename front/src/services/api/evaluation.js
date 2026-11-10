import { request } from "./request";

const BASE = "/admin/evaluation/questions";

export async function getEvaluationDocuments() {
  const data = await request("/admin/evaluation/documents");
  return data.items || [];
}

export async function getEvaluationRuns() {
  const data = await request("/admin/evaluation/runs");
  return data.items || [];
}

export function startEvaluationRun() {
  return request("/admin/evaluation/runs", { method: "POST" });
}

export function getEvaluationRun(runId) {
  return request(`/admin/evaluation/runs/${runId}`);
}

export async function getEvaluationQuestions(status) {
  const query = status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";
  const data = await request(`${BASE}${query}`);
  return data.items || [];
}

export async function generateEvaluationQuestions(documentId, count) {
  const data = await request(`${BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_id: Number(documentId), count: Number(count) }),
  });
  return data.items || [];
}

export function updateEvaluationQuestion(questionId, question, expectedAnswer) {
  return request(`${BASE}/${questionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, expected_answer: expectedAnswer }),
  });
}

export function getEvaluationQuestion(questionId) {
  return request(`${BASE}/${questionId}`);
}

export function approveEvaluationQuestion(questionId, embedding) {
  return request(`${BASE}/${questionId}/approve`, {
    method: "POST",
    headers: embedding ? { "Content-Type": "application/json" } : undefined,
    body: embedding ? JSON.stringify({ embedding }) : undefined,
  });
}

export async function deleteEvaluationQuestion(questionId) {
  await request(`${BASE}/${questionId}`, { method: "DELETE" });
}
