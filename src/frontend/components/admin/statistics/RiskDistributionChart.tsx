'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { RiskDistribution } from '@/types';

const COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#3b82f6',
  SAFE: '#22c55e',
  'N/A': '#9ca3af',
};

const LABELS: Record<string, string> = {
  CRITICAL: '게재불가',
  HIGH: '수정권고',
  MEDIUM: '수정제안',
  LOW: '주의',
  SAFE: '통과',
  'N/A': '불필요',
};

interface RiskDistributionChartProps {
  data?: RiskDistribution[];
  loading: boolean;
}

export default function RiskDistributionChart({ data, loading }: RiskDistributionChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">위험도별 분포</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">위험도별 분포</h3>
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
          데이터가 없습니다
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);
  const chartData = data.map((item) => ({
    ...item,
    name: LABELS[item.level] || item.level,
    fill: COLORS[item.level] || '#9ca3af',
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">위험도별 분포</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="count"
              nameKey="name"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [
                `${value}건 (${((Number(value) / total) * 100).toFixed(1)}%)`,
                name,
              ]}
            />
            <Legend
              formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
