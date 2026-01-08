'use client';

import { useState, useEffect, useCallback } from 'react';
import { Eye, RefreshCw, ChevronLeft, ChevronRight, FileSearch, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { RiskBadge } from '@/components/ui/Badge';
import DetailModal from '@/components/analysis/DetailModal';
import { getAnalysisHistory, getAnalysisDetail, deleteAnalysisHistory, formatDate } from '@/lib/api';
import { AnalysisHistoryItem, BatchFileResult, RiskLevel } from '@/types';

const PAGE_SIZE = 10;

type SortField = 'filename' | 'risk_level' | 'judgment' | 'completed_at';
type SortOrder = 'asc' | 'desc';

// Sort Icon Component
function SortIcon({ field, currentField, currentOrder }: {
  field: SortField;
  currentField: SortField;
  currentOrder: SortOrder;
}) {
  if (field !== currentField) {
    return <ChevronUp className="h-3 w-3 text-gray-300" />;
  }
  return currentOrder === 'asc' ? (
    <ChevronUp className="h-3 w-3 text-emerald-500" />
  ) : (
    <ChevronDown className="h-3 w-3 text-emerald-500" />
  );
}

export default function AnalysisHistoryList() {
  const [items, setItems] = useState<AnalysisHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // Filter
  const [filterRisk, setFilterRisk] = useState<RiskLevel | null>(null);

  // Sort
  const [sortBy, setSortBy] = useState<SortField>('completed_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Selection
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // Detail Modal
  const [selectedItem, setSelectedItem] = useState<AnalysisHistoryItem | null>(null);
  const [detailResult, setDetailResult] = useState<BatchFileResult | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Message
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAnalysisHistory({
        page,
        pageSize: PAGE_SIZE,
        riskLevel: filterRisk,
        sortBy,
        sortOrder,
      });
      setItems(response.items);
      setTotalPages(response.pagination.total_pages);
      setTotalItems(response.pagination.total_items);
      setSelectedItems(new Set()); // 선택 초기화
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filterRisk, sortBy, sortOrder]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Generate unique key for item
  const getItemKey = (item: AnalysisHistoryItem) => `${item.batch_id}::${item.filename}`;

  const handleViewDetail = async (item: AnalysisHistoryItem) => {
    setSelectedItem(item);
    setLoadingDetail(true);
    try {
      const result = await getAnalysisDetail(item.batch_id, item.filename);
      setDetailResult(result);
    } catch (error) {
      console.error('Failed to fetch detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedItem(null);
    setDetailResult(null);
  };

  const handleFilterChange = (risk: RiskLevel | null) => {
    setFilterRisk(risk);
    setPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'completed_at' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(getItemKey)));
    }
  };

  const handleSelectItem = (item: AnalysisHistoryItem) => {
    const key = getItemKey(item);
    const newSelected = new Set(selectedItems);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedItems(newSelected);
  };

  // Delete handler
  const handleDelete = async () => {
    if (selectedItems.size === 0) return;

    const confirmMessage = `선택한 ${selectedItems.size}개 항목을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`;
    if (!window.confirm(confirmMessage)) return;

    setDeleting(true);
    setMessage(null);

    try {
      const itemsToDelete = items
        .filter((item) => selectedItems.has(getItemKey(item)))
        .map((item) => ({
          batch_id: item.batch_id,
          filename: item.filename,
        }));

      const result = await deleteAnalysisHistory(itemsToDelete);

      if (result.success) {
        setMessage({
          type: 'success',
          text: result.message,
        });
        setSelectedItems(new Set());
        // 현재 페이지 데이터가 모두 삭제되면 이전 페이지로
        if (itemsToDelete.length === items.length && page > 1) {
          setPage(page - 1);
        } else {
          fetchHistory();
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '삭제에 실패했습니다.',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header with Refresh & Delete */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          분석 이력 ({totalItems}건)
        </h3>
        <div className="flex items-center gap-2">
          {selectedItems.size > 0 && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? '삭제 중...' : `${selectedItems.size}개 삭제`}
            </button>
          )}
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`px-4 py-2 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="float-right font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-2">
        <button
          onClick={() => handleFilterChange(null)}
          className={`px-3 py-1 text-xs rounded-full transition-colors ${
            filterRisk === null
              ? 'bg-gray-800 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
          }`}
        >
          전체
        </button>
        {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'SAFE'] as RiskLevel[]).map((risk) => (
          <button
            key={risk}
            onClick={() => handleFilterChange(risk)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filterRisk === risk
                ? 'bg-gray-800 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {risk}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-center">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selectedItems.size === items.length}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('filename')}
              >
                <div className="flex items-center gap-1">
                  파일명
                  <SortIcon field="filename" currentField={sortBy} currentOrder={sortOrder} />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('risk_level')}
              >
                <div className="flex items-center gap-1">
                  위험도
                  <SortIcon field="risk_level" currentField={sortBy} currentOrder={sortOrder} />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('judgment')}
              >
                <div className="flex items-center gap-1">
                  판정
                  <SortIcon field="judgment" currentField={sortBy} currentOrder={sortOrder} />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => handleSort('completed_at')}
              >
                <div className="flex items-center gap-1">
                  분석일시
                  <SortIcon field="completed_at" currentField={sortBy} currentOrder={sortOrder} />
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                상세
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
                  로딩 중...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  <FileSearch className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                  분석 이력이 없습니다
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const itemKey = getItemKey(item);
                return (
                  <tr
                    key={`${item.batch_id}-${item.filename}-${idx}`}
                    className={`hover:bg-gray-50 ${
                      selectedItems.has(itemKey) ? 'bg-emerald-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(itemKey)}
                        onChange={() => handleSelectItem(item)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate">
                      {item.filename}
                    </td>
                    <td className="px-4 py-3">
                      {item.success ? (
                        <RiskBadge level={item.risk_level} />
                      ) : (
                        <span className="text-xs text-red-500">에러</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.success ? (item.judgment || '-') : '실패'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {item.completed_at ? formatDate(item.completed_at) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewDetail(item)}
                        className="inline-flex items-center justify-center p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                        title="상세 보기"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, totalItems)} /{' '}
            {totalItems}건
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-1 text-sm text-gray-700">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        loadingDetail ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg p-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
              <p className="mt-4 text-gray-600">상세 정보 로딩 중...</p>
            </div>
          </div>
        ) : detailResult ? (
          <DetailModal
            result={detailResult}
            batchId={selectedItem.batch_id}
            onClose={handleCloseDetail}
          />
        ) : (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg p-8 text-center">
              <FileSearch className="h-12 w-12 mx-auto text-gray-400" />
              <p className="mt-4 text-gray-600">상세 정보를 찾을 수 없습니다</p>
              <button
                onClick={handleCloseDetail}
                className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                닫기
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
