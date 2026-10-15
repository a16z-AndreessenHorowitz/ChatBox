import { env, pipeline } from '@xenova/transformers';

// Model này được tải từ Hugging Face, không lấy từ đường dẫn public của Vite.
env.allowLocalModels = false;
env.remoteHost = 'https://huggingface.co/';
env.useBrowserCache = true;

let extractor= null;

//kiểm tra xem đã được tải chưa
export function isClientEmbeddingReady() {
  return Boolean(extractor);
}

export async function getClientEmbedding(text, onProgress) {
  if (!extractor) {
    console.log('[Embedding] Bắt đầu tải model Xenova/multilingual-e5-small...');
    extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', {
      quantized: true,
      progress_callback: (progress) => {
        onProgress?.(progress);
        if (progress.status === 'progress') {
          console.log(
            `[Embedding] ${progress.file ?? 'model'}: ${Math.round(progress.progress ?? 0)}%`,
          );
        } else if (progress.status === 'done') {
          console.log(`[Embedding] Đã tải ${progress.file ?? 'model'}`);
        }
      },
    });
    console.log('[Embedding] Khởi tạo model thành công');
  }
  const formattedQuery = `query: ${text.trim()}`;
  const output = await extractor(formattedQuery, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}
