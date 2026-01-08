'use client';

import { FileStatus, FileStatusType } from '@/types';
import { CheckCircle2, XCircle, Loader2, FileText, Search, Clock, Upload } from 'lucide-react';

interface FileProgressListProps {
  fileStatuses: FileStatus[];
}

function getStatusIcon(status: FileStatusType) {
  switch (status) {
    case 'uploading':
      return <Upload className="h-4 w-4 text-purple-500 animate-pulse" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-gray-400" />;
    case 'ocr':
      return <FileText className="h-4 w-4 text-blue-500 animate-pulse" />;
    case 'analyzing':
      return <Search className="h-4 w-4 text-amber-500 animate-pulse" />;
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />;
  }
}

function getStatusLabel(status: FileStatusType) {
  switch (status) {
    case 'uploading':
      return '업로드';
    case 'pending':
      return '대기';
    case 'ocr':
      return 'OCR';
    case 'analyzing':
      return '분석';
    case 'completed':
      return '완료';
    case 'failed':
      return '실패';
    default:
      return '-';
  }
}

function getProgressBarColor(status: FileStatusType) {
  switch (status) {
    case 'uploading':
      return 'bg-purple-500';
    case 'pending':
      return 'bg-gray-300';
    case 'ocr':
      return 'bg-blue-500';
    case 'analyzing':
      return 'bg-amber-500';
    case 'completed':
      return 'bg-emerald-500';
    case 'failed':
      return 'bg-red-500';
    default:
      return 'bg-gray-300';
  }
}

export default function FileProgressList({ fileStatuses }: FileProgressListProps) {
  if (!fileStatuses || fileStatuses.length === 0) {
    return null;
  }

  const completedCount = fileStatuses.filter((f) => f.status === 'completed').length;
  const failedCount = fileStatuses.filter((f) => f.status === 'failed').length;
  const uploadingCount = fileStatuses.filter((f) => f.status === 'uploading').length;
  const processingCount = fileStatuses.filter(
    (f) => f.status === 'ocr' || f.status === 'analyzing'
  ).length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-emerald-500 animate-spin" />
          <span className="text-sm font-medium text-gray-700">파일별 진행 상태</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-emerald-600">{completedCount} 완료</span>
          {failedCount > 0 && <span className="text-red-600">{failedCount} 실패</span>}
          {uploadingCount > 0 && <span className="text-purple-600">{uploadingCount} 업로드</span>}
          <span className="text-amber-600">{processingCount} 처리중</span>
        </div>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {fileStatuses.map((file) => (
          <div key={file.filename} className="flex items-center gap-3">
            {getStatusIcon(file.status)}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700 truncate pr-2" title={file.filename}>
                  {file.filename}
                </span>
                <span
                  className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    file.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700'
                      : file.status === 'failed'
                        ? 'bg-red-50 text-red-700'
                        : file.status === 'analyzing'
                          ? 'bg-amber-50 text-amber-700'
                          : file.status === 'ocr'
                            ? 'bg-blue-50 text-blue-700'
                            : file.status === 'uploading'
                              ? 'bg-purple-50 text-purple-700'
                              : 'bg-gray-50 text-gray-600'
                  }`}
                >
                  {getStatusLabel(file.status)}
                </span>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${getProgressBarColor(file.status)}`}
                  style={{ width: `${file.progress}%` }}
                />
              </div>

              {file.error && (
                <p className="text-xs text-red-500 mt-1 truncate" title={file.error}>
                  {file.error}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
