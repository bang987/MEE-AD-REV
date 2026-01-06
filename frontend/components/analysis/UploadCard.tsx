'use client';

import { useCallback, useState } from 'react';
import { Upload, X, FileImage } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { formatFileSize } from '@/lib/api';

interface UploadCardProps {
  onFilesSelected: (files: File[]) => void;
  selectedFiles: File[];
  onClear: () => void;
  disabled?: boolean;
}

export default function UploadCard({
  onFilesSelected,
  selectedFiles,
  onClear,
  disabled,
}: UploadCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;

      const files = Array.from(e.dataTransfer.files).filter(
        (file) => file.type.startsWith('image/')
      );
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [disabled, onFilesSelected]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesSelected(files);
    }
    e.target.value = '';
  };

  return (
    <Card title="광고 이미지 배치 분석">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-emerald-400 bg-emerald-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-sm font-medium text-gray-900">
          이미지 파일을 드래그하거나 클릭하여 선택
        </p>
        <p className="mt-1 text-xs text-gray-500">
          JPG, PNG (최대 10개, 파일당 최대 10MB)
        </p>
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              선택된 파일 ({selectedFiles.length}개)
            </span>
            <button
              onClick={onClear}
              className="text-sm text-red-500 hover:text-red-600"
              disabled={disabled}
            >
              전체 취소
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1 bg-gray-50 rounded-lg p-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-1.5 px-3 bg-white rounded text-sm"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileImage className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{file.name}</span>
                </div>
                <span className="text-gray-500 flex-shrink-0 ml-2">
                  {formatFileSize(file.size)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
