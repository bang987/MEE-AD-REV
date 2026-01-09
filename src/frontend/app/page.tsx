'use client';

import { useEffect, useMemo } from 'react';
import { Play, RotateCcw, FolderOpen } from 'lucide-react';
import Button from '@/components/ui/Button';
import Message from '@/components/ui/Message';
import AnalysisCard from '@/components/analysis/AnalysisCard';
import FileProgressList from '@/components/analysis/FileProgressList';
import ResultsTable from '@/components/analysis/ResultsTable';
import DetailModal from '@/components/analysis/DetailModal';
import { useAnalysisStore } from '@/stores/analysisStore';
import { OCR_FILE_LIMITS } from '@/types';

export default function HomePage() {
  // Zustand store
  const {
    selectedFiles,
    ocrEngine,
    useAiAnalysis,
    useRagMode,
    isAnalyzing,
    fileStatuses,
    results,
    selectedResult,
    lastBatchId,
    isClassifying,
    message,
    addFiles,
    clearFiles,
    removeFile,
    setOcrEngine,
    setUseAiAnalysis,
    setUseRagMode,
    startAnalysis,
    stopPolling,
    setSelectedResult,
    classifyResults,
    setMessage,
    reset,
  } = useAnalysisStore();

  // 파생 상태: OCR 엔진별 파일 제한
  const fileLimit = useMemo(() => OCR_FILE_LIMITS[ocrEngine], [ocrEngine]);
  const isOverLimit = useMemo(() => selectedFiles.length > fileLimit, [selectedFiles.length, fileLimit]);

  // Handle file classification with confirmation
  const handleClassify = async () => {
    if (!lastBatchId || results.length === 0) {
      setMessage({ type: 'error', text: '분류할 결과가 없습니다.' });
      return;
    }

    // 분류될 파일 수 계산
    const classifiableResults = results.filter((r) => r.success && r.analysis_result);
    const counts: Record<string, number> = {
      unnecessary: 0,
      passed: 0,
      caution: 0,
      suggest_edit: 0,
      recommend_edit: 0,
      rejected: 0,
    };

    classifiableResults.forEach((r) => {
      const riskLevel = r.analysis_result!.risk_level;
      switch (riskLevel) {
        case 'N/A': counts.unnecessary++; break;
        case 'SAFE': counts.passed++; break;
        case 'LOW': counts.caution++; break;
        case 'MEDIUM': counts.suggest_edit++; break;
        case 'HIGH': counts.recommend_edit++; break;
        case 'CRITICAL': counts.rejected++; break;
      }
    });

    const confirmMessage = `파일을 판정 결과에 따라 분류하시겠습니까?\n\n` +
      `• 불필요 (unnecessary): ${counts.unnecessary}개\n` +
      `• 통과 (passed): ${counts.passed}개\n` +
      `• 주의 (caution): ${counts.caution}개\n` +
      `• 수정제안 (suggest_edit): ${counts.suggest_edit}개\n` +
      `• 수정권고 (recommend_edit): ${counts.recommend_edit}개\n` +
      `• 게재불가 (rejected): ${counts.rejected}개\n\n` +
      `총 ${classifiableResults.length}개 파일이 해당 폴더로 이동됩니다.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    await classifyResults();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Messages */}
      {message && (
        <div className="mb-6">
          <Message
            type={message.type}
            message={message.text}
            onClose={() => setMessage(null)}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Upload & Options */}
        <div className="lg:col-span-1 space-y-6">
          <AnalysisCard
            selectedFiles={selectedFiles}
            onFilesSelected={addFiles}
            onClearFiles={clearFiles}
            onRemoveFile={removeFile}
            ocrEngine={ocrEngine}
            setOcrEngine={setOcrEngine}
            useAiAnalysis={useAiAnalysis}
            setUseAiAnalysis={setUseAiAnalysis}
            useRagMode={useRagMode}
            setUseRagMode={setUseRagMode}
            disabled={isAnalyzing}
          />

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={startAnalysis}
              disabled={isAnalyzing || selectedFiles.length === 0 || isOverLimit}
              isLoading={isAnalyzing}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              분석 시작
            </Button>
            <Button
              variant="secondary"
              onClick={reset}
              disabled={isAnalyzing}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Right Column: Progress & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* File Progress List */}
          {isAnalyzing && fileStatuses.length > 0 && (
            <FileProgressList fileStatuses={fileStatuses} />
          )}

          {/* Results Table */}
          {results.length > 0 && (
            <>
              <ResultsTable
                results={results}
                onViewDetail={(result) => setSelectedResult(result)}
              />
              {/* Classify Button */}
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={handleClassify}
                  disabled={isClassifying || !lastBatchId}
                  isLoading={isClassifying}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  판정 결과에 따라 파일 분류
                </Button>
              </div>
            </>
          )}

          {/* Empty State */}
          {!isAnalyzing && results.length === 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg
                  className="mx-auto h-16 w-16"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                분석 결과가 여기에 표시됩니다
              </h3>
              <p className="text-sm text-gray-500">
                이미지 파일을 업로드하고 분석을 시작하세요
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedResult && (
        <DetailModal
          result={selectedResult}
          batchId={lastBatchId}
          onClose={() => setSelectedResult(null)}
        />
      )}
    </div>
  );
}
