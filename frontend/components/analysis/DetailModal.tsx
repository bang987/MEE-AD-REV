'use client';

import { useState } from 'react';
import { X, AlertTriangle, FileText, Lightbulb, ImageIcon, ZoomIn, ZoomOut } from 'lucide-react';
import { BatchFileResult } from '@/types';
import { RiskBadge, getJudgment } from '@/components/ui/Badge';
import { getBatchImageUrl } from '@/lib/api';

interface DetailModalProps {
  result: BatchFileResult;
  batchId: string | null;
  onClose: () => void;
}

export default function DetailModal({ result, batchId, onClose }: DetailModalProps) {
  const analysis = result.analysis_result;
  const ocr = result.ocr_result;
  const [imageZoom, setImageZoom] = useState(1);
  const [imageError, setImageError] = useState(false);

  const imageUrl = batchId ? getBatchImageUrl(batchId, result.filename) : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-emerald-500" />
              <h2 className="text-lg font-semibold text-gray-900 truncate max-w-md">
                {result.filename}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
            {!result.success ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700">{result.error}</p>
              </div>
            ) : analysis ? (
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">위험도</p>
                    <RiskBadge level={analysis.risk_level} />
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">판정</p>
                    <p className="text-sm font-medium text-gray-900">
                      {getJudgment(analysis.risk_level)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">총점</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {analysis.total_score}점
                    </p>
                  </div>
                </div>

                {/* Summary Text */}
                {analysis.summary && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">{analysis.summary}</p>
                  </div>
                )}

                {/* Violations */}
                {analysis.violations && analysis.violations.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <h3 className="text-sm font-semibold text-gray-900">
                        위반 사항 ({analysis.violations.length}건)
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {analysis.violations.map((violation, idx) => (
                        <div
                          key={idx}
                          className="bg-orange-50 border border-orange-200 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-orange-900">
                                  {violation.category}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  violation.severity === 'HIGH'
                                    ? 'bg-red-100 text-red-700'
                                    : violation.severity === 'MEDIUM'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {violation.severity}
                                </span>
                              </div>
                              <p className="text-sm text-orange-800">
                                키워드: <span className="font-medium">&quot;{violation.keyword}&quot;</span>
                                {violation.count > 1 && ` (${violation.count}회 발견)`}
                              </p>
                              {violation.description && (
                                <p className="mt-1 text-xs text-orange-700">
                                  {violation.description}
                                </p>
                              )}
                              {violation.law && (
                                <p className="mt-1 text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded inline-block">
                                  관련법규: {violation.law}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-orange-900">
                                {violation.score}점
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Original Image */}
                {imageUrl && !imageError && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5 text-blue-500" />
                        <h3 className="text-sm font-semibold text-gray-900">
                          원본 이미지
                        </h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setImageZoom((z) => Math.max(0.5, z - 0.25))}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                          title="축소"
                        >
                          <ZoomOut className="h-4 w-4" />
                        </button>
                        <span className="text-xs text-gray-500 min-w-[3rem] text-center">
                          {Math.round(imageZoom * 100)}%
                        </span>
                        <button
                          onClick={() => setImageZoom((z) => Math.min(2, z + 0.25))}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                          title="확대"
                        >
                          <ZoomIn className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-gray-100 border border-gray-200 rounded-lg p-2 overflow-auto max-h-80">
                      <img
                        src={imageUrl}
                        alt={result.filename}
                        className="mx-auto rounded transition-transform"
                        style={{ transform: `scale(${imageZoom})`, transformOrigin: 'top center' }}
                        onError={() => setImageError(true)}
                      />
                    </div>
                  </div>
                )}

                {/* AI Analysis */}
                {analysis.ai_analysis && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="h-5 w-5 text-purple-500" />
                      <h3 className="text-sm font-semibold text-gray-900">
                        AI 심층 분석
                      </h3>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <p className="text-sm text-purple-800 whitespace-pre-wrap">
                        {analysis.ai_analysis}
                      </p>
                    </div>
                  </div>
                )}

                {/* OCR Result */}
                {ocr && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      OCR 추출 텍스트
                    </h3>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {ocr.text || '추출된 텍스트 없음'}
                      </p>
                      <div className="mt-2 pt-2 border-t border-gray-200 flex items-center gap-4 text-xs text-gray-500">
                        <span>신뢰도: {Math.round((ocr.confidence || 0) * 100)}%</span>
                        {ocr.fields_count && <span>필드 수: {ocr.fields_count}개</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">분석 결과가 없습니다.</p>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
