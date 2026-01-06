'use client';

import { Loader2 } from 'lucide-react';

interface ProgressBarProps {
  progress: number;
  currentFile: string;
  processedCount: number;
  totalCount: number;
}

export default function ProgressBar({
  progress,
  currentFile,
  processedCount,
  totalCount,
}: ProgressBarProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-emerald-500 animate-spin" />
          <span className="text-sm font-medium text-gray-700">분석 진행 중</span>
        </div>
        <span className="text-sm text-gray-500">
          {processedCount} / {totalCount} 파일
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
        <div
          className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 truncate">
        현재 파일: {currentFile || '대기 중...'}
      </p>
    </div>
  );
}
