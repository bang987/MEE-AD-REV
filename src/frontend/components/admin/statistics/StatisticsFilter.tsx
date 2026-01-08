'use client';

import { StatisticsFilters } from '@/types';

interface StatisticsFilterProps {
  filters: StatisticsFilters;
  onChange: (filters: StatisticsFilters) => void;
}

const presets = [
  { id: 'today', label: '오늘' },
  { id: '7days', label: '7일' },
  { id: '30days', label: '30일' },
  { id: 'all', label: '전체' },
] as const;

export default function StatisticsFilter({ filters, onChange }: StatisticsFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">기간:</span>
      <div className="flex gap-1">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() =>
              onChange({
                ...filters,
                dateRange: { preset: preset.id },
              })
            }
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filters.dateRange.preset === preset.id
                ? 'bg-emerald-500 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
