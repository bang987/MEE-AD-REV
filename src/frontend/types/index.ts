// Analysis Types
export type RiskLevel = 'N/A' | 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
// 판정과 1:1 매칭되는 파일 분류 타입
export type JudgmentType =
  | 'unnecessary'    // 불필요 (N/A)
  | 'passed'         // 통과 (SAFE)
  | 'caution'        // 주의 (LOW)
  | 'suggest_edit'   // 수정제안 (MEDIUM)
  | 'recommend_edit' // 수정권고 (HIGH)
  | 'rejected';      // 게재불가 (CRITICAL)
export type OCREngine = 'naver' | 'paddle';

// OCR 엔진별 최대 파일 개수 제한
export const OCR_FILE_LIMITS: Record<OCREngine, number> = {
  naver: 5,
  paddle: 50,
};

export interface Violation {
  keyword: string;
  category: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  score: number;
  count: number;
  repetition_bonus?: number;
  total_score?: number;
  law: string;
  description?: string;
  context?: string;
}

// AI가 발견한 위반 사항
export interface AIViolation {
  type: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

// 판정 타입
export type Judgment = '불필요' | '통과' | '주의' | '수정제안' | '수정권고' | '게재불가';

export interface OCRResult {
  text: string;
  confidence: number;
  fields_count?: number;
  engine?: OCREngine;
}

export interface AnalysisResult {
  violations: Violation[];
  risk_score: number;  // 위험점수 (0-100)
  total_score: number;  // 하위 호환성 (risk_score와 동일)
  risk_level: RiskLevel;  // 위험도 (위험점수 기반 자동 계산)
  judgment: Judgment;  // 판정 (위험도 기반 자동 계산)
  summary: string;
  ai_analysis: string | null;  // 1차 AI 분석 텍스트 (상세용)
  ai_violations: AIViolation[];  // AI가 발견한 위반 목록
  keyword_risk_score: number;  // 키워드만의 위험점수 (참고용)
  violation_count: number;  // 키워드 + AI 위반 총 건수
}

export interface BatchFileResult {
  filename: string;
  success: boolean;
  ocr_result: OCRResult | null;
  analysis_result: AnalysisResult | null;
  error: string | null;
}

// 개별 파일 처리 상태
export type FileStatusType = 'uploading' | 'pending' | 'ocr' | 'analyzing' | 'completed' | 'failed';

export interface FileStatus {
  filename: string;
  status: FileStatusType;
  progress: number;
  error?: string;
}

export interface BatchStatus {
  batch_id: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  total_files: number;
  processed_files: number;
  progress_percent: number;
  results: BatchFileResult[];
  errors: string[];
  start_time?: string;
  estimated_completion?: string;
  elapsed_seconds?: number;
  current_phase?: 'uploading' | 'analyzing';
  file_statuses?: FileStatus[];  // 파일별 상태
}

// Admin Document Types
export interface Document {
  filename: string;
  size: number;
  type?: string;
  modified: string;
}

export interface DocumentListResponse {
  success: boolean;
  documents: Document[];
  total_count: number;
}

export interface DocumentUploadResponse {
  success: boolean;
  uploaded?: string[];
  failed?: { filename: string; reason: string }[];
  message: string;
  rag_indexed?: {
    files: { filename: string; chunks: number }[];
    total_chunks: number;
    total_index_count: number;
  };
}

export interface DocumentDeleteResponse {
  success: boolean;
  message: string;
  rag_removed?: {
    chunks_removed: number;
    total_index_count: number;
  };
}

// Classification Types
export interface FileClassification {
  filename: string;
  category: JudgmentType;
}

export interface ClassifyResponse {
  success: boolean;
  success_count: number;
  failed_count: number;
}

// Analysis History Types (Admin 분석 이력)
export interface AnalysisHistoryItem {
  batch_id: string;
  filename: string;
  risk_level: RiskLevel;
  judgment: string;
  violation_count: number;
  total_score: number;
  completed_at: string;
  success: boolean;
  error?: string;
}

export interface AnalysisHistoryPagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface AnalysisHistoryResponse {
  success: boolean;
  items: AnalysisHistoryItem[];
  pagination: AnalysisHistoryPagination;
}

// Statistics Types
export interface StatisticsFilters {
  dateRange: {
    preset: 'today' | '7days' | '30days' | 'all';
    startDate?: string;
    endDate?: string;
  };
}

export interface StatisticsSummary {
  total_analyses: number;
  total_with_violations: number;
  violation_rate: number;
  average_risk_score: number;
  success_rate: number;
}

export interface RiskDistribution {
  level: RiskLevel;
  count: number;
  percentage: number;
}

export interface JudgmentDistribution {
  judgment: Judgment;
  count: number;
  percentage: number;
}

export interface ViolationCategory {
  category: string;
  count: number;
  percentage: number;
}

export interface ViolationKeyword {
  keyword: string;
  category: string;
  count: number;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface StatisticsResponse {
  success: boolean;
  period: { start_date: string; end_date: string };
  summary: StatisticsSummary;
  risk_distribution: RiskDistribution[];
  judgment_distribution: JudgmentDistribution[];
  top_violation_categories: ViolationCategory[];
  top_violation_keywords: ViolationKeyword[];
}
