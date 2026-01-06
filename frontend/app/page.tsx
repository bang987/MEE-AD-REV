'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Play, RotateCcw, FolderOpen } from 'lucide-react';
import Button from '@/components/ui/Button';
import Message from '@/components/ui/Message';
import { getCategory } from '@/components/ui/Badge';
import UploadCard from '@/components/analysis/UploadCard';
import AnalysisOptions from '@/components/analysis/AnalysisOptions';
import FileProgressList from '@/components/analysis/FileProgressList';
import ResultsTable from '@/components/analysis/ResultsTable';
import DetailModal from '@/components/analysis/DetailModal';
import { startBatchAnalysis, getBatchStatus, classifyFiles } from '@/lib/api';
import { OCREngine, BatchFileResult, BatchStatus, FileClassification, FileStatus } from '@/types';

export default function HomePage() {
  // File selection
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Analysis options
  const [ocrEngine, setOcrEngine] = useState<OCREngine>('naver');
  const [useAiAnalysis, setUseAiAnalysis] = useState(true);
  const [useRagMode, setUseRagMode] = useState(true);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);

  // Results
  const [results, setResults] = useState<BatchFileResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<BatchFileResult | null>(null);
  const [lastBatchId, setLastBatchId] = useState<string | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);

  // Messages
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const newFiles = files.filter((f) => !existingNames.has(f.name));
      return [...prev, ...newFiles].slice(0, 10); // Max 10 files
    });
  }, []);

  const handleClearFiles = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  const handleStartAnalysis = async () => {
    if (selectedFiles.length === 0) {
      setMessage({ type: 'error', text: '분석할 파일을 선택해주세요.' });
      return;
    }

    setIsAnalyzing(true);
    setResults([]);
    setFileStatuses([]);
    setMessage(null);

    try {
      const response = await startBatchAnalysis(
        selectedFiles,
        ocrEngine,
        useAiAnalysis,
        useRagMode
      );

      if (response.batch_id) {
        setBatchId(response.batch_id);
        setLastBatchId(response.batch_id);
        startPolling(response.batch_id);
      } else {
        throw new Error('배치 ID를 받지 못했습니다.');
      }
    } catch (error) {
      setIsAnalyzing(false);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '분석 시작에 실패했습니다.',
      });
    }
  };

  const startPolling = (id: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const status: BatchStatus = await getBatchStatus(id);

        // 파일별 상태 업데이트
        if (status.file_statuses) {
          setFileStatuses(status.file_statuses);
        }

        if (status.status === 'completed' || status.status === 'failed') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }

          setIsAnalyzing(false);
          setBatchId(null);

          if (status.results) {
            setResults(status.results);
          }

          if (status.status === 'completed') {
            const errorCount = status.results?.filter((r) => !r.success).length || 0;
            const successCount = (status.results?.length || 0) - errorCount;
            setMessage({
              type: 'success',
              text: `분석 완료: ${successCount}개 성공, ${errorCount}개 실패`,
            });
          } else {
            setMessage({
              type: 'error',
              text: status.errors?.[0] || '분석 중 오류가 발생했습니다.',
            });
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 1000);
  };

  const handleReset = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    setSelectedFiles([]);
    setIsAnalyzing(false);
    setBatchId(null);
    setLastBatchId(null);
    setFileStatuses([]);
    setResults([]);
    setMessage(null);
  };

  // Handle file classification
  const handleClassify = async () => {
    if (!lastBatchId || results.length === 0) {
      setMessage({ type: 'error', text: '분류할 결과가 없습니다.' });
      return;
    }

    // 분류될 파일 수 계산
    const classifiableResults = results.filter((r) => r.success && r.analysis_result);
    const approvedCount = classifiableResults.filter((r) =>
      ['SAFE', 'LOW'].includes(r.analysis_result!.risk_level)
    ).length;
    const reviewCount = classifiableResults.filter((r) =>
      r.analysis_result!.risk_level === 'MEDIUM'
    ).length;
    const rejectedCount = classifiableResults.filter((r) =>
      ['HIGH', 'CRITICAL'].includes(r.analysis_result!.risk_level)
    ).length;

    // 확인 다이얼로그 표시
    const confirmMessage = `파일을 판정 결과에 따라 분류하시겠습니까?\n\n` +
      `• 승인 (approved): ${approvedCount}개\n` +
      `• 검토필요 (review): ${reviewCount}개\n` +
      `• 거부 (rejected): ${rejectedCount}개\n\n` +
      `총 ${classifiableResults.length}개 파일이 해당 폴더로 이동됩니다.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsClassifying(true);
    setMessage(null);

    try {
      const classifications: FileClassification[] = results
        .filter((r) => r.success && r.analysis_result)
        .map((r) => ({
          filename: r.filename,
          category: getCategory(r.analysis_result!.risk_level),
        }));

      if (classifications.length === 0) {
        setMessage({ type: 'error', text: '분류 가능한 파일이 없습니다.' });
        setIsClassifying(false);
        return;
      }

      const response = await classifyFiles(lastBatchId, classifications);

      if (response.success) {
        setMessage({
          type: 'success',
          text: `파일 분류 완료: ${response.success_count}개 성공, ${response.failed_count}개 실패`,
        });
      } else {
        throw new Error('분류 실패');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '파일 분류에 실패했습니다.',
      });
    } finally {
      setIsClassifying(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

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
          <UploadCard
            onFilesSelected={handleFilesSelected}
            selectedFiles={selectedFiles}
            onClear={handleClearFiles}
            disabled={isAnalyzing}
          />

          <AnalysisOptions
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
              onClick={handleStartAnalysis}
              disabled={isAnalyzing || selectedFiles.length === 0}
              isLoading={isAnalyzing}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              분석 시작
            </Button>
            <Button
              variant="secondary"
              onClick={handleReset}
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
          onClose={() => setSelectedResult(null)}
        />
      )}
    </div>
  );
}
