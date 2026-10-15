import { request } from "./request";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const R2_UPLOAD_TIMEOUT_MS = 60_000;

async function uploadToStorage(uploadUrl, file, headers = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), R2_UPLOAD_TIMEOUT_MS);

  try {
    return await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        ...headers,
      },
      body: file,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Upload lên Cloudflare R2 quá lâu, vui lòng thử lại.');
    }
    throw new Error('Không upload được lên Cloudflare R2. Kiểm tra CORS bucket R2 hoặc kết nối mạng.');
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function uploadViaBackend(file) {
  const formData = new FormData();
  formData.append('file', file);
  return request('/documents/upload', {
    method: 'POST',
    body: formData,
  });
}


export async function uploadFile(file) {
  if (!file) throw new Error("Chưa chọn tệp.");
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`${file.name} vượt quá giới hạn 50MB.`);
  }

  console.info('[Upload] Xin quyền upload:', file.name);
  const credentials = await request('/documents/upload/signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      original_filename: file.name,
      content_type: file.type || 'application/octet-stream',
      file_size: file.size,
    }),
  });
  console.info('[Upload] Đang upload lên Cloudflare R2:', credentials.metadata?.public_id);
  let uploadResponse;
  try {
    uploadResponse = await uploadToStorage(credentials.upload_url, file, credentials.headers);
  } catch (error) {
    console.warn('[Upload] Direct R2 upload lỗi, chuyển sang backend upload:', error.message);
    return uploadViaBackend(file);
  }
  const uploadText = await uploadResponse.text().catch(() => '');
  if (!uploadResponse.ok) {
    throw new Error(uploadText || 'Upload storage thất bại.');
  }

  const metadata = credentials.metadata || {};
  metadata.original_filename = file.name;
  metadata.file_size = file.size;

  console.info('[Upload] Upload R2 xong, lưu metadata:', metadata.public_id);
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
