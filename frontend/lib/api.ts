import type {
  BatchStatus,
  DocumentListResponse,
  DocumentUploadResponse,
  DocumentDeleteResponse,
  ClassifyResponse,
  FileClassification,
  OCREngine,
} from '@/types';

// 브라우저에서 접근한 호스트를 기반으로 API URL 결정
function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // 클라이언트: 현재 접속한 호스트의 8000 포트 사용
    const hostname = window.location.hostname;
    return `http://${hostname}:8000`;
  }
  // 서버사이드: 환경변수 또는 기본값
  return process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.2:8000';
}

// Batch Analysis APIs
export async function startBatchAnalysis(
  files: File[],
  ocrEngine: OCREngine,
  useAi: boolean,
  useRag: boolean
): Promise<{ batch_id: string }> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  formData.append('ocr_engine', ocrEngine);
  formData.append('use_ai', useAi ? 'true' : 'false');
  formData.append('use_rag', useRag ? 'true' : 'false');

  const response = await fetch(`${getApiBaseUrl()}/api/batch-upload-analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('배치 분석 시작 실패');
  }

  return response.json();
}

export async function getBatchStatus(batchId: string): Promise<BatchStatus> {
  const response = await fetch(`${getApiBaseUrl()}/api/batch-status/${batchId}`);

  if (!response.ok) {
    throw new Error('상태 조회 실패');
  }

  return response.json();
}

export async function classifyFiles(
  batchId: string,
  classifications: FileClassification[]
): Promise<ClassifyResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/classify-files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batch_id: batchId, classifications }),
  });

  if (!response.ok) {
    throw new Error('분류 실패');
  }

  return response.json();
}

// Admin Document APIs
export async function getDocuments(): Promise<DocumentListResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/admin/documents`);

  if (!response.ok) {
    throw new Error('문서 목록 조회 실패');
  }

  return response.json();
}

export async function uploadDocuments(files: File[]): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const response = await fetch(`${getApiBaseUrl()}/api/admin/documents`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('문서 업로드 실패');
  }

  return response.json();
}

export async function deleteDocument(filename: string): Promise<DocumentDeleteResponse> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/admin/documents/${encodeURIComponent(filename)}`,
    { method: 'DELETE' }
  );

  if (!response.ok) {
    throw new Error('문서 삭제 실패');
  }

  return response.json();
}

// Utility functions
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return `${date.toLocaleDateString('ko-KR')} ${date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}
