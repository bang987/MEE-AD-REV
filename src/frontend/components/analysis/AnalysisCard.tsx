'use client';

import { useCallback, useState } from 'react';
import { Upload, FileImage, X, AlertTriangle } from 'lucide-react';
import Card from '@/components/ui/Card';
import { OCREngine, OCR_FILE_LIMITS } from '@/types';
import { formatFileSize } from '@/lib/api';

interface AnalysisCardProps {
  selectedFiles: File[];
  onFilesSelected: (files: File[]) => void;
  onClearFiles: () => void;
  onRemoveFile: (index: number) => void;
  ocrEngine: OCREngine;
  setOcrEngine: (engine: OCREngine) => void;
  useAiAnalysis: boolean;
  setUseAiAnalysis: (use: boolean) => void;
  useRagMode: boolean;
  setUseRagMode: (use: boolean) => void;
  disabled?: boolean;
}

export default function AnalysisCard({
  selectedFiles,
  onFilesSelected,
  onClearFiles,
  onRemoveFile,
  ocrEngine,
  setOcrEngine,
  useAiAnalysis,
  setUseAiAnalysis,
  useRagMode,
  setUseRagMode,
  disabled,
}: AnalysisCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const fileLimit = OCR_FILE_LIMITS[ocrEngine];
  const isOverLimit = selectedFiles.length > fileLimit;

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;

      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith('image/')
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
    <Card title="분석 설정">
      {/* OCR Engine Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          OCR 엔진
        </label>
        <div className="flex gap-2">
          {(['naver', 'paddle'] as OCREngine[]).map((engine) => (
            <button
              key={engine}
              onClick={() => setOcrEngine(engine)}
              disabled={disabled}
              className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg border transition-colors ${
                ocrEngine === engine
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex flex-col items-center">
                <span>{engine === 'naver' ? 'Naver Clova OCR' : 'PaddleOCR'}</span>
                <span
                  className={`text-xs mt-1 ${
                    ocrEngine === engine ? 'text-emerald-100' : 'text-gray-400'
                  }`}
                >
                  최대 {OCR_FILE_LIMITS[engine]}개
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100 my-4" />

      {/* File Upload Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            파일 업로드 ({selectedFiles.length}/{fileLimit}개)
          </span>
          {selectedFiles.length > 0 && (
            <button
              onClick={onClearFiles}
              className="text-sm text-red-500 hover:text-red-600"
              disabled={disabled}
            >
              전체 삭제
            </button>
          )}
        </div>

        {/* Drag & Drop Zone */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
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
          <Upload className="mx-auto h-10 w-10 text-gray-400" />
          <p className="mt-2 text-sm font-medium text-gray-900">
            이미지를 드래그하거나 클릭
          </p>
          <p className="mt-1 text-xs text-gray-500">JPG, PNG (파일당 최대 10MB)</p>
        </div>

        {/* Warning Message */}
        {isOverLimit && (
          <div className="flex items-center gap-2 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <div className="text-sm text-amber-700">
              <span className="font-medium">파일이 {fileLimit}개를 초과합니다.</span>
              <span className="ml-1">
                {selectedFiles.length - fileLimit}개 파일을 삭제해주세요.
              </span>
            </div>
          </div>
        )}

        {/* File List */}
        {selectedFiles.length > 0 && (
          <div className="mt-3 max-h-48 overflow-y-auto space-y-1 bg-gray-50 rounded-lg p-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className={`flex items-center justify-between py-1.5 px-3 bg-white rounded text-sm ${
                  index >= fileLimit ? 'border border-amber-200 bg-amber-50' : ''
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileImage className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{file.name}</span>
                  {index >= fileLimit && (
                    <span className="text-xs text-amber-600 flex-shrink-0">(초과)</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className="text-gray-500">{formatFileSize(file.size)}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(index);
                    }}
                    disabled={disabled}
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 my-4" />

      {/* Analysis Options */}
      <div className="space-y-4">
        {/* AI Analysis Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">AI 심층 분석</label>
            <p className="text-xs text-gray-500 mt-0.5">GPT를 사용한 고급 분석</p>
          </div>
          <button
            onClick={() => setUseAiAnalysis(!useAiAnalysis)}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              useAiAnalysis ? 'bg-emerald-500' : 'bg-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                useAiAnalysis ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* RAG Mode Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">RAG 모드</label>
            <p className="text-xs text-gray-500 mt-0.5">법규 문서 기반 분석</p>
          </div>
          <button
            onClick={() => setUseRagMode(!useRagMode)}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              useRagMode ? 'bg-emerald-500' : 'bg-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                useRagMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </Card>
  );
}
