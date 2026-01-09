import { create } from 'zustand';
import { OCREngine, BatchFileResult, FileStatus } from '@/types';
import { startBatchAnalysis, getBatchStatus, classifyFiles } from '@/lib/api';
import { getCategory } from '@/components/ui/Badge';

interface Message {
  type: 'success' | 'error';
  text: string;
}

interface AnalysisState {
  // File selection
  selectedFiles: File[];

  // Analysis options
  ocrEngine: OCREngine;
  useAiAnalysis: boolean;
  useRagMode: boolean;

  // Analysis state
  isAnalyzing: boolean;
  batchId: string | null;
  fileStatuses: FileStatus[];

  // Results
  results: BatchFileResult[];
  selectedResult: BatchFileResult | null;
  lastBatchId: string | null;
  isClassifying: boolean;

  // Messages
  message: Message | null;

  // Polling
  pollIntervalId: NodeJS.Timeout | null;
}

interface AnalysisActions {
  // File actions
  setSelectedFiles: (files: File[]) => void;
  addFiles: (files: File[]) => void;
  removeFile: (index: number) => void;
  clearFiles: () => void;

  // Option actions
  setOcrEngine: (engine: OCREngine) => void;
  setUseAiAnalysis: (value: boolean) => void;
  setUseRagMode: (value: boolean) => void;

  // Analysis actions
  startAnalysis: () => Promise<void>;
  stopPolling: () => void;

  // Result actions
  setSelectedResult: (result: BatchFileResult | null) => void;
  classifyResults: () => Promise<void>;

  // Message actions
  setMessage: (message: Message | null) => void;

  // Reset
  reset: () => void;
}

const initialState: AnalysisState = {
  selectedFiles: [],
  ocrEngine: 'naver',
  useAiAnalysis: true,
  useRagMode: true,
  isAnalyzing: false,
  batchId: null,
  fileStatuses: [],
  results: [],
  selectedResult: null,
  lastBatchId: null,
  isClassifying: false,
  message: null,
  pollIntervalId: null,
};

export const useAnalysisStore = create<AnalysisState & AnalysisActions>((set, get) => ({
  ...initialState,

  // File actions
  setSelectedFiles: (files) => set({ selectedFiles: files }),

  addFiles: (files) => set((state) => {
    const existingNames = new Set(state.selectedFiles.map((f) => f.name));
    const newFiles = files.filter((f) => !existingNames.has(f.name));
    return { selectedFiles: [...state.selectedFiles, ...newFiles] };
  }),

  removeFile: (index) => set((state) => ({
    selectedFiles: state.selectedFiles.filter((_, i) => i !== index),
  })),

  clearFiles: () => set({ selectedFiles: [] }),

  // Option actions
  setOcrEngine: (engine) => set({ ocrEngine: engine }),
  setUseAiAnalysis: (value) => set({ useAiAnalysis: value }),
  setUseRagMode: (value) => set({ useRagMode: value }),

  // Analysis actions
  startAnalysis: async () => {
    const state = get();

    if (state.selectedFiles.length === 0) {
      set({ message: { type: 'error', text: '분석할 파일을 선택해주세요.' } });
      return;
    }

    set({
      isAnalyzing: true,
      results: [],
      message: null,
      fileStatuses: state.selectedFiles.map((file) => ({
        filename: file.name,
        status: 'uploading' as const,
        progress: 0,
      })),
    });

    try {
      const response = await startBatchAnalysis(
        state.selectedFiles,
        state.ocrEngine,
        state.useAiAnalysis,
        state.useRagMode
      );

      if (response.batch_id) {
        set({ batchId: response.batch_id, lastBatchId: response.batch_id });

        // Start polling
        const pollIntervalId = setInterval(async () => {
          try {
            const status = await getBatchStatus(response.batch_id);

            if (status.file_statuses) {
              set({ fileStatuses: status.file_statuses });
            }

            if (status.status === 'completed' || status.status === 'failed') {
              get().stopPolling();

              set({
                isAnalyzing: false,
                batchId: null,
                results: status.results || [],
              });

              if (status.status === 'completed') {
                const errorCount = status.results?.filter((r) => !r.success).length || 0;
                const successCount = (status.results?.length || 0) - errorCount;
                set({
                  message: {
                    type: 'success',
                    text: `분석 완료: ${successCount}개 성공, ${errorCount}개 실패`,
                  },
                });
              } else {
                set({
                  message: {
                    type: 'error',
                    text: status.errors?.[0] || '분석 중 오류가 발생했습니다.',
                  },
                });
              }
            }
          } catch (error) {
            console.error('Polling error:', error);
          }
        }, 1000);

        set({ pollIntervalId });
      } else {
        throw new Error('배치 ID를 받지 못했습니다.');
      }
    } catch (error) {
      set({
        isAnalyzing: false,
        message: {
          type: 'error',
          text: error instanceof Error ? error.message : '분석 시작에 실패했습니다.',
        },
      });
    }
  },

  stopPolling: () => {
    const { pollIntervalId } = get();
    if (pollIntervalId) {
      clearInterval(pollIntervalId);
      set({ pollIntervalId: null });
    }
  },

  // Result actions
  setSelectedResult: (result) => set({ selectedResult: result }),

  classifyResults: async () => {
    const state = get();

    if (!state.lastBatchId || state.results.length === 0) {
      set({ message: { type: 'error', text: '분류할 결과가 없습니다.' } });
      return;
    }

    set({ isClassifying: true, message: null });

    try {
      const classifications = state.results
        .filter((r) => r.success && r.analysis_result)
        .map((r) => ({
          filename: r.filename,
          category: getCategory(r.analysis_result!.risk_level),
        }));

      if (classifications.length === 0) {
        set({ message: { type: 'error', text: '분류 가능한 파일이 없습니다.' } });
        return;
      }

      const response = await classifyFiles(state.lastBatchId, classifications);

      if (response.success) {
        set({
          message: {
            type: 'success',
            text: `파일 분류 완료: ${response.success_count}개 성공, ${response.failed_count}개 실패`,
          },
        });
      } else {
        throw new Error('분류 실패');
      }
    } catch (error) {
      set({
        message: {
          type: 'error',
          text: error instanceof Error ? error.message : '파일 분류에 실패했습니다.',
        },
      });
    } finally {
      set({ isClassifying: false });
    }
  },

  // Message actions
  setMessage: (message) => set({ message }),

  // Reset
  reset: () => {
    get().stopPolling();
    set({
      ...initialState,
      // Keep options
      ocrEngine: get().ocrEngine,
      useAiAnalysis: get().useAiAnalysis,
      useRagMode: get().useRagMode,
    });
  },
}));
