'use client';

import { ViolationKeyword } from '@/types';

interface ViolationKeywordsTableProps {
  data?: ViolationKeyword[];
  loading: boolean;
}

const severityColors: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-blue-100 text-blue-700',
};

export default function ViolationKeywordsTable({ data, loading }: ViolationKeywordsTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">위반 키워드 TOP 10</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">위반 키워드 TOP 10</h3>
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
          데이터가 없습니다
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">위반 키워드 TOP 10</h3>
      <div className="overflow-auto max-h-64">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">순위</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">키워드</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">카테고리</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">건수</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((item, index) => (
              <tr key={item.keyword} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                <td className="px-3 py-2">
                  <span className="font-medium text-gray-900">{item.keyword}</span>
                  <span
                    className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                      severityColors[item.severity] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {item.severity}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-600">{item.category}</td>
                <td className="px-3 py-2 text-right font-medium text-gray-900">
                  {item.count.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
