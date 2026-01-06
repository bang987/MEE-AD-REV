'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getBatchStatus } from '@/lib/api';
import { BatchStatus } from '@/types';

interface UseBatchPollingOptions {
  enabled?: boolean;
  initialInterval?: number;
  maxInterval?: number;
  backoffMultiplier?: number;
  maxRetries?: number;
  onComplete?: (status: BatchStatus) => void;
  onError?: (error: Error) => void;
}

interface UseBatchPollingReturn {
  status: BatchStatus | null;
  error: Error | null;
  isPolling: boolean;
  retryCount: number;
  stop: () => void;
  restart: () => void;
}

/**
 * 배치 분석 상태를 폴링하는 커스텀 훅
 * - 지수적 백오프로 폴링 간격 조절
 * - 에러 발생 시 재시도
 * - 완료/실패 시 자동 중지
 */
export function useBatchPolling(
  batchId: string | null,
  options: UseBatchPollingOptions = {}
): UseBatchPollingReturn {
  const {
    enabled = true,
    initialInterval = 1000,
    maxInterval = 5000,
    backoffMultiplier = 1.2,
    maxRetries = 5,
    onComplete,
    onError,
  } = options;

  const [status, setStatus] = useState<BatchStatus | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const currentIntervalRef = useRef(initialInterval);

  // 폴링 중지
  const stop = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // 폴링 재시작
  const restart = useCallback(() => {
    setRetryCount(0);
    setError(null);
    currentIntervalRef.current = initialInterval;
  }, [initialInterval]);

  useEffect(() => {
    mountedRef.current = true;

    if (!batchId || !enabled) {
      // stop() 대신 직접 타임아웃 정리 (setState 호출 방지)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- 폴링 시작 시 상태 초기화 필요
    setIsPolling(true);
    currentIntervalRef.current = initialInterval;

    const poll = async () => {
      if (!mountedRef.current) return;

      try {
        const data = await getBatchStatus(batchId);

        if (!mountedRef.current) return;

        setStatus(data);
        setError(null);
        setRetryCount(0);

        // 완료 또는 실패 시 폴링 중지
        if (data.status === 'completed' || data.status === 'failed') {
          setIsPolling(false);
          onComplete?.(data);
          return;
        }

        // 다음 폴링 예약 (간격 점진적 증가)
        currentIntervalRef.current = Math.min(
          currentIntervalRef.current * backoffMultiplier,
          maxInterval
        );

        timeoutRef.current = setTimeout(poll, currentIntervalRef.current);
      } catch (err) {
        if (!mountedRef.current) return;

        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        if (retryCount < maxRetries) {
          setRetryCount((prev) => prev + 1);

          // 재시도 시 백오프 간격 증가
          const backoffDelay = Math.min(
            initialInterval * Math.pow(2, retryCount),
            maxInterval
          );

          timeoutRef.current = setTimeout(poll, backoffDelay);
        } else {
          // 최대 재시도 횟수 초과
          setIsPolling(false);
          onError?.(error);
        }
      }
    };

    // 즉시 첫 번째 폴링 시작
    poll();

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [
    batchId,
    enabled,
    initialInterval,
    maxInterval,
    backoffMultiplier,
    maxRetries,
    retryCount,
    onComplete,
    onError,
  ]);

  return {
    status,
    error,
    isPolling,
    retryCount,
    stop,
    restart,
  };
}

export default useBatchPolling;
