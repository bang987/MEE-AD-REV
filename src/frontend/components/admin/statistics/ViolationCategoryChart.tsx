'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ViolationCategory } from '@/types';

interface ViolationCategoryChartProps {
  data?: ViolationCategory[];
  loading: boolean;
}

export default function ViolationCategoryChart({ data, loading }: ViolationCategoryChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">위반 카테고리 TOP 5</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">위반 카테고리 TOP 5</h3>
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
          데이터가 없습니다
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">위반 카테고리 TOP 5</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
          >
            <XAxis
              dataKey="category"
              tick={{ fontSize: 11 }}
              angle={-30}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) => [`${value}건`, '건수']}
              labelFormatter={(label) => `${label}`}
            />
            <Bar
              dataKey="count"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
