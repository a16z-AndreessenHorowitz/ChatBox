import { request } from "./request";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

async function uploadToStorage(uploadUrl, file, headers = {}) {
  let response;
  try {
    response = await fetch(uploadUrl, {
      method: 'PUT',
      headers,
      body: file,
    });
  } catch (error) {
    throw new Error(
      'Không kết nối được tới R2 khi upload bằng presigned URL. Kiểm tra CORS bucket: origin frontend, phương thức PUT và header Content-Type.',
      { cause: error },
    );
  }

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(
      `R2 từ chối upload (HTTP ${response.status})${details ? `: ${details}` : '.'}`,
    );
  }
}

export async function uploadFile(file) {
  if (!file) throw new Error("Chưa chọn tệp.");
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`${file.name} vượt quá giới hạn 50MB.`);
  }

  console.info('[Upload] Xin presigned URL:', file.name);
  const credentials = await request('/documents/upload/signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      original_filename: file.name,
      content_type: file.type || 'application/octet-stream',
      file_size: file.size,
    }),
  });

  await uploadToStorage(credentials.upload_url, file, credentials.headers);

  const metadata = {
    ...credentials.metadata,
    original_filename: file.name,
    file_size: file.size,
  };
  return request('/documents/upload/metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata),
  });
}

export async function getRecentFiles() {
  return request("/documents/recent",{
    method: "GET"
  })
}

export async function getDocumentDetail(documentId) {
  return request(`/documents/${documentId}`, {
    method: "GET",
  });
}

export async function updateDocumentMarkdown(documentId, markdownContent) {
  return request(`/documents/${documentId}/markdown`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markdown_content: markdownContent }),
  });
}
