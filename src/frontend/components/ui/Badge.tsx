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
  // Judgment Types (6개 - 판정과 1:1 매칭)
  unnecessary: 'bg-gray-100 text-gray-500',      // 불필요
  passed: 'bg-green-100 text-green-700',         // 통과
  caution: 'bg-blue-100 text-blue-700',          // 주의
  suggest_edit: 'bg-yellow-100 text-yellow-700', // 수정제안
  recommend_edit: 'bg-orange-100 text-orange-700', // 수정권고
  rejected: 'bg-red-100 text-red-700',           // 게재불가
  // File Types / Categories
  txt: 'bg-emerald-100 text-emerald-700',
  pdf: 'bg-red-100 text-red-700',
  medical_ad: 'bg-purple-100 text-purple-700',
  general_ad: 'bg-blue-100 text-blue-700',
  non_ad: 'bg-gray-100 text-gray-700',
  unknown: 'bg-gray-100 text-gray-500',
};

// 판정 분류 라벨 (6개 - 판정과 1:1 매칭)
const categoryLabels: Record<string, string> = {
  unnecessary: '불필요',
  passed: '통과',
  caution: '주의',
  suggest_edit: '수정제안',
  recommend_edit: '수정권고',
  rejected: '게재불가',
  // 기타
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
// 백엔드 판정 기준과 일치시킴
export function getJudgment(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'N/A':
      return '불필요';
    case 'SAFE':
      return '통과';
    case 'LOW':
      return '주의';
    case 'MEDIUM':
      return '수정제안';
    case 'HIGH':
      return '수정권고';
    case 'CRITICAL':
      return '게재불가';
    default:
      return '주의';
  }
}

// 파일 분류 카테고리 (판정과 1:1 매칭)
export function getCategory(riskLevel: RiskLevel): JudgmentType {
  switch (riskLevel) {
    case 'N/A':
      return 'unnecessary';    // 불필요
    case 'SAFE':
      return 'passed';         // 통과
    case 'LOW':
      return 'caution';        // 주의
    case 'MEDIUM':
      return 'suggest_edit';   // 수정제안
    case 'HIGH':
      return 'recommend_edit'; // 수정권고
    case 'CRITICAL':
      return 'rejected';       // 게재불가
    default:
      return 'caution';
  }
}
