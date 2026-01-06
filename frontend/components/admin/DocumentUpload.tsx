'use client';

import { useCallback, useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { formatFileSize } from '@/lib/api';

interface DocumentUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  disabled?: boolean;
}

// 컴포넌트 외부로 이동하여 useCallback 의존성 경고 해결
const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
];

export default function DocumentUpload({ onUpload, disabled }: DocumentUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled || isUploading) return;

      const files = Array.from(e.dataTransfer.files).filter((file) =>
        ACCEPTED_TYPES.includes(file.type) ||
        file.name.endsWith('.md') ||
        file.name.endsWith('.txt')
      );
      if (files.length > 0) {
        setSelectedFiles(files);
      }
    },
    [disabled, isUploading]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files);
    }
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      await onUpload(selectedFiles);
      setSelectedFiles([]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    setSelectedFiles([]);
  };

  return (
    <Card title="법규 문서 업로드">
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver
            ? 'border-emerald-400 bg-emerald-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !isUploading) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() =>
          !disabled && !isUploading && document.getElementById('doc-file-input')?.click()
        }
      >
        <input
          id="doc-file-input"
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || isUploading}
        />
        <Upload className="mx-auto h-10 w-10 text-gray-400" />
        <p className="mt-3 text-sm font-medium text-gray-900">
          문서 파일을 드래그하거나 클릭하여 선택
        </p>
        <p className="mt-1 text-xs text-gray-500">
          PDF, DOC, DOCX, TXT, MD 형식 지원
        </p>
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              선택된 파일 ({selectedFiles.length}개)
            </span>
            <button
              onClick={handleClear}
              className="text-sm text-red-500 hover:text-red-600"
              disabled={isUploading}
            >
              취소
            </button>
          </div>
          <div className="space-y-1 bg-gray-50 rounded-lg p-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-1.5 px-3 bg-white rounded text-sm"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{file.name}</span>
                </div>
                <span className="text-gray-500 flex-shrink-0 ml-2">
                  {formatFileSize(file.size)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Button
              variant="primary"
              onClick={handleUpload}
              isLoading={isUploading}
              disabled={isUploading}
              className="w-full"
            >
              업로드 및 인덱싱
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
