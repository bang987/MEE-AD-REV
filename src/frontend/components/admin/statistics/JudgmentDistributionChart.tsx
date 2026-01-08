'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { JudgmentDistribution } from '@/types';

const COLORS: Record<string, string> = {
  '게재불가': '#ef4444',
  '수정권고': '#f97316',
  '수정제안': '#eab308',
  '주의': '#3b82f6',
  '통과': '#22c55e',
  '불필요': '#9ca3af',
};

interface JudgmentDistributionChartProps {
  data?: JudgmentDistribution[];
  loading: boolean;
}

export default function JudgmentDistributionChart({ data, loading }: JudgmentDistributionChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">판정별 분포</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">판정별 분포</h3>
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
          데이터가 없습니다
        </div>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    name: item.judgment,
    fill: COLORS[item.judgment] || '#9ca3af',
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">판정별 분포</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
          >
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12 }}
              width={60}
            />
            <Tooltip
              formatter={(value) => [`${value}건`, '건수']}
              labelFormatter={(label) => `${label}`}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
