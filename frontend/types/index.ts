// Analysis Types
export type RiskLevel = 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type JudgmentType = 'approved' | 'rejected' | 'review';
export type OCREngine = 'naver' | 'paddle';

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

export interface OCRResult {
  text: string;
  confidence: number;
  fields_count?: number;
}

export interface AnalysisResult {
  violations: Violation[];
  total_score: number;
  risk_level: RiskLevel;
  summary: string;
  ai_analysis: string | null;
  violation_count: number;
}

export interface BatchFileResult {
  filename: string;
  success: boolean;
  ocr_result: OCRResult | null;
  analysis_result: AnalysisResult | null;
  error: string | null;
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
