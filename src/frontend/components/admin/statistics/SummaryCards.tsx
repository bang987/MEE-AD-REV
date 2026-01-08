'use client';

import { FileText, AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react';
import { StatisticsSummary } from '@/types';

interface SummaryCardsProps {
  data?: StatisticsSummary;
  loading: boolean;
}

export default function SummaryCards({ data, loading }: SummaryCardsProps) {
  const cards = [
    {
      title: '총 분석 건수',
      value: data?.total_analyses ?? 0,
      unit: '건',
      icon: FileText,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
    },
    {
      title: '위반 발견율',
      value: data?.violation_rate ?? 0,
      unit: '%',
      icon: AlertTriangle,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-500',
    },
    {
      title: '평균 위험 점수',
      value: data?.average_risk_score ?? 0,
      unit: '점',
      icon: TrendingUp,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
    },
    {
      title: '분석 성공률',
      value: data?.success_rate ?? 0,
      unit: '%',
      icon: CheckCircle,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 ${card.iconBg} rounded-lg`}>
              <card.icon className={`h-5 w-5 ${card.iconColor}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{card.title}</p>
              {loading ? (
                <div className="h-7 w-20 bg-gray-200 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-xl font-semibold text-gray-900">
                  {typeof card.value === 'number'
                    ? card.value.toLocaleString()
                    : card.value}
                  <span className="text-sm font-normal text-gray-500 ml-0.5">
                    {card.unit}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
