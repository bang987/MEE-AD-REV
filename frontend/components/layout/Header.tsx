'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, FileText } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  const isAdmin = pathname === '/admin';

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-emerald-500" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                의료광고 AI 심의 시스템
              </h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                의료광고 이미지의 법규 준수 여부를 AI로 분석합니다
              </p>
            </div>
          </Link>

          <nav className="flex items-center gap-4">
            {isAdmin ? (
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FileText className="h-4 w-4" />
                메인
              </Link>
            ) : (
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors"
              >
                <Settings className="h-4 w-4" />
                Admin
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
