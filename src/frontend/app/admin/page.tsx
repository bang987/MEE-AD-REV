'use client';

import { useState, useEffect, useCallback } from 'react';
import { Database, BookOpen, History } from 'lucide-react';
import Message from '@/components/ui/Message';
import DocumentUpload from '@/components/admin/DocumentUpload';
import DocumentList from '@/components/admin/DocumentList';
import AnalysisHistoryList from '@/components/admin/AnalysisHistoryList';
import { getDocuments, uploadDocuments, deleteDocument, formatFileSize } from '@/lib/api';
import { Document } from '@/types';

type TabType = 'documents' | 'history';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('history');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getDocuments();
      setDocuments(response.documents);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '문서 목록을 가져오는데 실패했습니다.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'documents') {
      fetchDocuments();
    }
  }, [activeTab, fetchDocuments]);

  const handleUpload = async (files: File[]) => {
    try {
      const result = await uploadDocuments(files);
      setMessage({
        type: 'success',
        text: result.message || `${files.length}개 파일이 업로드되었습니다. RAG 인덱스가 업데이트되었습니다.`,
      });
      await fetchDocuments();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '파일 업로드에 실패했습니다.',
      });
    }
  };

  const handleDelete = async (filename: string) => {
    try {
      await deleteDocument(filename);
      setMessage({
        type: 'success',
        text: `'${filename}' 파일이 삭제되었습니다. RAG 인덱스가 업데이트되었습니다.`,
      });
      await fetchDocuments();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '파일 삭제에 실패했습니다.',
      });
    }
  };

  const totalSize = documents.reduce((sum, doc) => sum + doc.size, 0);

  const tabs = [
    { id: 'history' as const, label: '분석 이력', icon: History },
    { id: 'documents' as const, label: 'RAG 문서 관리', icon: BookOpen },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Database className="h-7 w-7 text-emerald-500" />
          관리자
        </h1>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Messages */}
      {message && (
        <div className="mb-6">
          <Message
            type={message.type}
            message={message.text}
            onClose={() => setMessage(null)}
          />
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'history' && <AnalysisHistoryList />}

      {activeTab === 'documents' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <BookOpen className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">등록 문서</p>
                  <p className="text-xl font-semibold text-gray-900">{documents.length}개</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Database className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">총 용량</p>
                  <p className="text-xl font-semibold text-gray-900">{formatFileSize(totalSize)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <svg
                    className="h-5 w-5 text-purple-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500">RAG 상태</p>
                  <p className="text-xl font-semibold text-emerald-600">활성</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Upload */}
            <div className="lg:col-span-1">
              <DocumentUpload onUpload={handleUpload} />
            </div>

            {/* Right Column: Document List */}
            <div className="lg:col-span-2">
              <DocumentList
                documents={documents}
                onDelete={handleDelete}
                onRefresh={fetchDocuments}
                loading={loading}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
