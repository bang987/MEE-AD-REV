'use client';

import Card from '@/components/ui/Card';
import { OCREngine } from '@/types';

interface AnalysisOptionsProps {
  ocrEngine: OCREngine;
  setOcrEngine: (engine: OCREngine) => void;
  useAiAnalysis: boolean;
  setUseAiAnalysis: (use: boolean) => void;
  useRagMode: boolean;
  setUseRagMode: (use: boolean) => void;
  disabled?: boolean;
}

export default function AnalysisOptions({
  ocrEngine,
  setOcrEngine,
  useAiAnalysis,
  setUseAiAnalysis,
  useRagMode,
  setUseRagMode,
  disabled,
}: AnalysisOptionsProps) {
  return (
    <Card title="분석 옵션">
      <div className="space-y-4">
        {/* OCR Engine Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            OCR 엔진
          </label>
          <div className="flex gap-2">
            {(['naver', 'paddle'] as OCREngine[]).map((engine) => (
              <button
                key={engine}
                onClick={() => setOcrEngine(engine)}
                disabled={disabled}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  ocrEngine === engine
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {engine === 'naver' && 'Naver Clova OCR'}
                {engine === 'paddle' && 'PaddleOCR'}
              </button>
            ))}
          </div>
        </div>

        {/* AI Analysis Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">
              AI 심층 분석
            </label>
            <p className="text-xs text-gray-500 mt-0.5">
              GPT 를 사용한 고급 분석
            </p>
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
            <label className="text-sm font-medium text-gray-700">
              RAG 모드
            </label>
            <p className="text-xs text-gray-500 mt-0.5">
              법규 문서 기반 분석
            </p>
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
