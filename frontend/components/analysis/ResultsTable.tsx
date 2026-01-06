'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Eye, Filter, X } from 'lucide-react';
import { BatchFileResult, RiskLevel } from '@/types';
import { RiskBadge, getJudgment } from '@/components/ui/Badge';

interface ResultsTableProps {
  results: BatchFileResult[];
  onViewDetail: (result: BatchFileResult) => void;
}

type SortField = 'filename' | 'risk_level' | 'violations' | 'success';
type SortDirection = 'asc' | 'desc';

const riskOrder: Record<RiskLevel, number> = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  SAFE: 1,
};

// SortIcon을 컴포넌트 외부로 분리
function SortIcon({
  field,
  sortField,
  sortDirection
}: {
  field: SortField;
  sortField: SortField;
  sortDirection: SortDirection;
}) {
  if (sortField !== field) return null;
  return sortDirection === 'asc' ? (
    <ChevronUp className="h-4 w-4" />
  ) : (
    <ChevronDown className="h-4 w-4" />
  );
}

export default function ResultsTable({ results, onViewDetail }: ResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>('filename');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterRisk, setFilterRisk] = useState<RiskLevel | 'ALL'>('ALL');
  const [showFilter, setShowFilter] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    let filtered = results;

    // Filter by risk level
    if (filterRisk !== 'ALL') {
      filtered = results.filter((r) => {
        if (!r.success) return false;
        return r.analysis_result?.risk_level === filterRisk;
      });
    }

    // Sort
    return [...filtered].sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;

      switch (sortField) {
        case 'filename':
          return multiplier * a.filename.localeCompare(b.filename);
        case 'risk_level':
          const riskA = !a.success ? 0 : riskOrder[a.analysis_result?.risk_level || 'SAFE'];
          const riskB = !b.success ? 0 : riskOrder[b.analysis_result?.risk_level || 'SAFE'];
          return multiplier * (riskA - riskB);
        case 'violations':
          const violA = a.analysis_result?.violation_count || 0;
          const violB = b.analysis_result?.violation_count || 0;
          return multiplier * (violA - violB);
        case 'success':
          return multiplier * (Number(a.success) - Number(b.success));
        default:
          return 0;
      }
    });
  }, [results, filterRisk, sortField, sortDirection]);

  const riskCounts = useMemo(() => {
    const counts: Record<RiskLevel | 'ERROR', number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      SAFE: 0,
      ERROR: 0,
    };
    results.forEach((r) => {
      if (!r.success) {
        counts.ERROR++;
      } else if (r.analysis_result?.risk_level) {
        counts[r.analysis_result.risk_level]++;
      }
    });
    return counts;
  }, [results]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          분석 결과 ({filteredAndSorted.length}개)
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              filterRisk !== 'ALL'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            필터
            {filterRisk !== 'ALL' && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setFilterRisk('ALL');
                }}
                className="ml-1 hover:text-emerald-900"
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilter && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-2">
          <button
            onClick={() => setFilterRisk('ALL')}
            className={`px-3 py-1 text-xs rounded-full ${
              filterRisk === 'ALL'
                ? 'bg-gray-800 text-white'
                : 'bg-white border border-gray-300 text-gray-700'
            }`}
          >
            전체 ({results.length})
          </button>
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'SAFE'] as RiskLevel[]).map((risk) => (
            <button
              key={risk}
              onClick={() => setFilterRisk(risk)}
              className={`px-3 py-1 text-xs rounded-full ${
                filterRisk === risk
                  ? 'bg-gray-800 text-white'
                  : 'bg-white border border-gray-300 text-gray-700'
              }`}
            >
              {risk} ({riskCounts[risk]})
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('filename')}
              >
                <div className="flex items-center gap-1">
                  파일명
                  <SortIcon field="filename" sortField={sortField} sortDirection={sortDirection} />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('risk_level')}
              >
                <div className="flex items-center gap-1">
                  위험도
                  <SortIcon field="risk_level" sortField={sortField} sortDirection={sortDirection} />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                판정
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('violations')}
              >
                <div className="flex items-center gap-1">
                  위반 항목
                  <SortIcon field="violations" sortField={sortField} sortDirection={sortDirection} />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                점수
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                상세
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSorted.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate">
                  {item.filename}
                </td>
                <td className="px-4 py-3">
                  {!item.success ? (
                    <span className="text-sm text-red-500">에러</span>
                  ) : (
                    <RiskBadge level={item.analysis_result?.risk_level || 'SAFE'} />
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {!item.success ? (
                    <span className="text-red-500">처리 실패</span>
                  ) : (
                    // 백엔드에서 제공하는 judgment 사용, 없으면 폴백
                    item.analysis_result?.judgment || getJudgment(item.analysis_result?.risk_level || 'SAFE')
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {!item.success ? (
                    <span className="text-red-500">{item.error}</span>
                  ) : (
                    <span>
                      {item.analysis_result?.violation_count || 0}건
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {item.success && (
                    <span className="font-medium">
                      {item.analysis_result?.risk_score ?? item.analysis_result?.total_score ?? 0}점
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onViewDetail(item)}
                    className="inline-flex items-center justify-center p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSorted.length === 0 && (
        <div className="px-4 py-8 text-center text-gray-500 text-sm">
          표시할 결과가 없습니다
        </div>
      )}
    </div>
  );
}
