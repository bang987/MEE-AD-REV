'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Calendar } from 'lucide-react';
import StatisticsFilter from './StatisticsFilter';
import SummaryCards from './SummaryCards';
import RiskDistributionChart from './RiskDistributionChart';
import JudgmentDistributionChart from './JudgmentDistributionChart';
import ViolationCategoryChart from './ViolationCategoryChart';
import ViolationKeywordsTable from './ViolationKeywordsTable';
import { getStatistics } from '@/lib/api';
import { StatisticsResponse, StatisticsFilters } from '@/types';

export default function StatisticsDashboard() {
  const [data, setData] = useState<StatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<StatisticsFilters>({
    dateRange: { preset: '30days' },
  });

  const fetchStatistics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getStatistics(filters);
      setData(response);
    } catch (err) {
      setError('통계 데이터를 불러오는데 실패했습니다.');
      console.error('Failed to fetch statistics:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          {data?.period.start_date && data?.period.end_date ? (
            <span>{data.period.start_date} ~ {data.period.end_date}</span>
          ) : (
            <span>전체 기간</span>
          )}
        </div>
        <button
          onClick={fetchStatistics}
          disabled={loading}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="새로고침"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Bar */}
      <StatisticsFilter filters={filters} onChange={setFilters} />

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <SummaryCards data={data?.summary} loading={loading} />

      {/* Row 1: Risk & Judgment Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskDistributionChart data={data?.risk_distribution} loading={loading} />
        <JudgmentDistributionChart data={data?.judgment_distribution} loading={loading} />
      </div>

      {/* Row 2: Violation Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ViolationCategoryChart data={data?.top_violation_categories} loading={loading} />
        <ViolationKeywordsTable data={data?.top_violation_keywords} loading={loading} />
      </div>
    </div>
  );
}
