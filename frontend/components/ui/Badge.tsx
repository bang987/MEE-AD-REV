import type { RiskLevel, JudgmentType } from '@/types';

interface BadgeProps {
  variant: RiskLevel | JudgmentType | 'txt' | 'pdf' | string;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<string, string> = {
  // Risk Levels
  'N/A': 'bg-gray-100 text-gray-500',
  SAFE: 'bg-green-100 text-green-700',
  LOW: 'bg-blue-100 text-blue-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
  // Judgment Types
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  review: 'bg-yellow-100 text-yellow-700',
  // File Types / Categories
  txt: 'bg-emerald-100 text-emerald-700',
  pdf: 'bg-red-100 text-red-700',
  medical_ad: 'bg-purple-100 text-purple-700',
  general_ad: 'bg-blue-100 text-blue-700',
  non_ad: 'bg-gray-100 text-gray-700',
  unknown: 'bg-gray-100 text-gray-500',
};

const categoryLabels: Record<string, string> = {
  medical_ad: '의료광고',
  general_ad: '일반광고',
  non_ad: '비광고',
  unknown: '미분류',
};

export default function Badge({ variant, children, className = '' }: BadgeProps) {
  const styles = variantStyles[variant] || 'bg-gray-100 text-gray-700';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles} ${className}`}
    >
      {children}
    </span>
  );
}

// Risk Badge component
interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

export function RiskBadge({ level, className = '' }: RiskBadgeProps) {
  const styles = variantStyles[level] || 'bg-gray-100 text-gray-700';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles} ${className}`}
    >
      {level}
    </span>
  );
}

// Category Badge component
interface CategoryBadgeProps {
  category: string;
  className?: string;
}

export function CategoryBadge({ category, className = '' }: CategoryBadgeProps) {
  const styles = variantStyles[category] || 'bg-gray-100 text-gray-700';
  const label = categoryLabels[category] || category;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles} ${className}`}
    >
      {label}
    </span>
  );
}

// Utility functions for converting risk level to judgment
export function getJudgment(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'SAFE':
    case 'LOW':
      return '통과';
    case 'HIGH':
    case 'CRITICAL':
      return '반려';
    default:
      return '검토';
  }
}

export function getCategory(riskLevel: RiskLevel): JudgmentType {
  if (riskLevel === 'SAFE' || riskLevel === 'LOW') return 'approved';
  if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') return 'rejected';
  return 'review';
}
