import type {
  BatchStatus,
  BatchFileResult,
  DocumentListResponse,
  DocumentUploadResponse,
  DocumentDeleteResponse,
  ClassifyResponse,
  FileClassification,
  OCREngine,
  RiskLevel,
  AnalysisHistoryResponse,
  StatisticsFilters,
  StatisticsResponse,
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

// Batch Image URL
export function getBatchImageUrl(batchId: string, filename: string): string {
  return `${getApiBaseUrl()}/api/batch-image/${encodeURIComponent(batchId)}/${encodeURIComponent(filename)}`;
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

// Analysis History APIs (Admin 분석 이력)
export interface GetAnalysisHistoryParams {
  page?: number;
  pageSize?: number;
  riskLevel?: RiskLevel | null;
  sortBy?: 'completed_at' | 'filename' | 'risk_level' | 'judgment';
  sortOrder?: 'asc' | 'desc';
}

export async function getAnalysisHistory(
  params: GetAnalysisHistoryParams = {}
): Promise<AnalysisHistoryResponse> {
  const {
    page = 1,
    pageSize = 10,
    riskLevel,
    sortBy = 'completed_at',
    sortOrder = 'desc',
  } = params;

  const searchParams = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    sort_by: sortBy,
    sort_order: sortOrder,
  });

  if (riskLevel) {
    searchParams.append('risk_level', riskLevel);
  }

  const response = await fetch(
    `${getApiBaseUrl()}/api/admin/analysis-history?${searchParams}`
  );

  if (!response.ok) {
    throw new Error('분석 이력 조회 실패');
  }

  return response.json();
}

// 상세 조회를 위한 함수 (기존 getBatchStatus 활용)
export async function getAnalysisDetail(
  batchId: string,
  filename: string
): Promise<BatchFileResult | null> {
  try {
    const batchStatus = await getBatchStatus(batchId);
    return batchStatus.results.find((r) => r.filename === filename) || null;
  } catch {
    return null;
  }
}

// 분석 이력 삭제
export interface DeleteHistoryItem {
  batch_id: string;
  filename: string;
}

export interface DeleteHistoryResponse {
  success: boolean;
  message: string;
  deleted_count: number;
  errors?: string[];
}

export async function deleteAnalysisHistory(
  items: DeleteHistoryItem[]
): Promise<DeleteHistoryResponse> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/admin/analysis-history/delete`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    }
  );

  if (!response.ok) {
    throw new Error('분석 이력 삭제 실패');
  }

  return response.json();
}

// Statistics API
export async function getStatistics(
  filters: StatisticsFilters
): Promise<StatisticsResponse> {
  const params = new URLSearchParams();

  // 기간 필터 - 프리셋에 따른 날짜 계산
  const today = new Date();
  let startDate: Date | null = null;

  switch (filters.dateRange.preset) {
    case 'today':
      startDate = today;
      break;
    case '7days':
      startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30days':
      startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
    default:
      startDate = null;
  }

  if (startDate) {
    params.append('start_date', startDate.toISOString().split('T')[0]);
    params.append('end_date', new Date().toISOString().split('T')[0]);
  }

  const response = await fetch(
    `${getApiBaseUrl()}/api/admin/statistics?${params}`
  );

  if (!response.ok) {
    throw new Error('통계 조회 실패');
  }

  return response.json();
}
