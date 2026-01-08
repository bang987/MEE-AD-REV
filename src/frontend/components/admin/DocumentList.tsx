'use client';

import { useState } from 'react';
import { FileText, Trash2, RefreshCw, Calendar, HardDrive } from 'lucide-react';
import { Document } from '@/types';
import { formatFileSize, formatDate } from '@/lib/api';
import Button from '@/components/ui/Button';

interface DocumentListProps {
  documents: Document[];
  onDelete: (filename: string) => Promise<void>;
  onRefresh: () => void;
  loading?: boolean;
}

export default function DocumentList({
  documents,
  onDelete,
  onRefresh,
  loading,
}: DocumentListProps) {
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  const handleDelete = async (filename: string) => {
    if (!confirm(`'${filename}' 파일을 삭제하시겠습니까?`)) return;

    setDeletingFile(filename);
    try {
      await onDelete(filename);
    } finally {
      setDeletingFile(null);
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const colors: Record<string, string> = {
      pdf: 'text-red-500',
      doc: 'text-blue-500',
      docx: 'text-blue-500',
      txt: 'text-gray-500',
      md: 'text-purple-500',
    };
    return colors[ext || ''] || 'text-gray-400';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          등록된 문서 ({documents.length}개)
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Table */}
      {documents.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  파일명
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  크기
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  수정일
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  삭제
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr key={doc.filename} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className={`h-4 w-4 ${getFileIcon(doc.filename)}`} />
                      <span className="text-sm text-gray-900 truncate max-w-[200px]">
                        {doc.filename}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <HardDrive className="h-3.5 w-3.5" />
                      {formatFileSize(doc.size)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(doc.modified)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(doc.filename)}
                      disabled={deletingFile === doc.filename}
                      className={`inline-flex items-center justify-center p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors ${
                        deletingFile === doc.filename ? 'opacity-50' : ''
                      }`}
                    >
                      {deletingFile === doc.filename ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-4 py-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">
            등록된 문서가 없습니다
          </p>
          <p className="text-xs text-gray-400 mt-1">
            법규 문서를 업로드하면 RAG 분석에 활용됩니다
          </p>
        </div>
      )}
    </div>
  );
}
