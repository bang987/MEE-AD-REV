import { useState } from 'react'
import { Upload, FileText, Loader2, AlertCircle } from 'lucide-react'
import axios from 'axios'
import './App.css'
import ErrorBoundary from './ErrorBoundary'

// API Base URL 설정
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function App() {
  // State 관리
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [useAI, setUseAI] = useState(false)

  // 파일 선택 핸들러
  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      // 파일 타입 검증
      if (!file.type.startsWith('image/')) {
        setError('이미지 파일만 업로드 가능합니다.')
        return
      }

      // 파일 크기 검증 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('파일 크기는 10MB 이하여야 합니다.')
        return
      }

      setSelectedFile(file)
      setError(null)
      setResult(null)

      // 이미지 미리보기
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // 파일 업로드 및 분석
  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('파일을 먼저 선택해주세요.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('🔍 Starting analysis...', selectedFile.name)

      // FormData 생성
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('use_ai', useAI ? 'true' : 'false')

      console.log('📤 Sending request to:', `${API_BASE_URL}/api/ocr-analyze`)

      // API 호출
      const response = await axios.post(
        `${API_BASE_URL}/api/ocr-analyze`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000, // 60초 타임아웃
        }
      )

      console.log('📥 Response received:', response.data)

      if (response.data.success) {
        console.log('✅ Analysis successful')
        setResult(response.data)
      } else {
        console.error('❌ Analysis failed:', response.data.error)
        setError(response.data.error || '분석에 실패했습니다.')
      }
    } catch (err) {
      console.error('❌ API Error:', err)
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        response: err.response?.data,
        status: err.response?.status
      })

      if (err.code === 'ECONNABORTED') {
        setError('요청 시간이 초과되었습니다. 다시 시도해주세요.')
      } else if (err.response) {
        setError(err.response.data.detail || err.response.data.error || '서버 오류가 발생했습니다.')
      } else if (err.request) {
        setError('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.')
      } else {
        setError('분석 중 오류가 발생했습니다: ' + err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  // 리셋
  const handleReset = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setResult(null)
    setError(null)
  }

  // OCR 텍스트에서 위반 키워드 하이라이팅 (React 컴포넌트로 반환)
  const highlightKeywords = (text, violations) => {
    if (!text || !violations || violations.length === 0) {
      return <span>{text}</span>
    }

    // 키워드와 severity 매핑
    const keywordMap = {}
    violations.forEach(v => {
      if (v.keyword) {
        keywordMap[v.keyword.toLowerCase()] = v.severity
      }
    })

    // 키워드를 길이 순으로 정렬 (긴 것부터)
    const keywords = Object.keys(keywordMap).sort((a, b) => b.length - a.length)

    if (keywords.length === 0) {
      return <span>{text}</span>
    }

    // 특수문자 이스케이프 함수
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // 모든 키워드로 정규표현식 생성
    const pattern = keywords.map(k => escapeRegex(k)).join('|')
    const regex = new RegExp(`(${pattern})`, 'gi')

    // 텍스트를 split하여 처리
    const parts = text.split(regex)

    return (
      <span>
        {parts.map((part, index) => {
          // 빈 문자열 무시
          if (!part) return null

          const lowerPart = part.toLowerCase()
          const severity = keywordMap[lowerPart]

          if (severity) {
            return (
              <span key={`h-${index}`} className={`highlight-${severity.toLowerCase()}`}>
                {part}
              </span>
            )
          }
          return <span key={`t-${index}`}>{part}</span>
        })}
      </span>
    )
  }

  // 통과/반려 판정
  const getJudgment = (riskLevel) => {
    if (!riskLevel) return { text: 'UNKNOWN', className: 'unknown', passed: false }

    const level = riskLevel.toUpperCase()
    if (level === 'SAFE' || level === 'LOW') {
      return { text: '통과', className: 'passed', passed: true }
    } else {
      return { text: '반려', className: 'rejected', passed: false }
    }
  }

  return (
    <div className="app">
      {/* 헤더 */}
      <header className="header">
        <div className="header-content">
          <h1 className="header-title">의료광고 AI 심의 시스템</h1>
          <p className="header-subtitle">의료광고 이미지의 법규 준수 여부를 분석합니다</p>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="main-content">
        {/* 업로드 섹션 */}
        <div className="upload-section">
          <div className="upload-card">
            <div className="upload-header">
              <Upload className="upload-icon" size={24} />
              <h2>광고 이미지 업로드</h2>
            </div>

            {/* 파일 선택 영역 */}
            <div className="file-input-area">
              <label htmlFor="file-input" className="file-label">
                <FileText size={48} className="file-icon" />
                <span className="file-text">
                  {selectedFile ? selectedFile.name : '이미지 파일을 선택하세요'}
                </span>
                <span className="file-hint">JPG, PNG (최대 10MB)</span>
              </label>
              <input
                id="file-input"
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleFileSelect}
                className="file-input"
              />
            </div>

            {/* 이미지 미리보기 */}
            {previewUrl && (
              <div className="preview-section">
                <h3>미리보기</h3>
                <img src={previewUrl} alt="Preview" className="preview-image" />
              </div>
            )}

            {/* 에러 메시지 */}
            {error && (
              <div className="error-message">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {/* AI 분석 옵션 */}
            {selectedFile && (
              <div style={{marginTop: '1rem', padding: '1rem', background: '#f7fafc', borderRadius: '8px'}}>
                <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                  <input
                    type="checkbox"
                    checked={useAI}
                    onChange={(e) => setUseAI(e.target.checked)}
                    style={{width: '18px', height: '18px', cursor: 'pointer'}}
                  />
                  <span style={{fontWeight: '500', color: '#2d3748'}}>
                    GPT-4 AI 분석 사용 (법규 근거 포함, 처리 시간 +15초)
                  </span>
                </label>
              </div>
            )}

            {/* 분석 버튼 */}
            <div className="button-group">
              <button
                onClick={handleAnalyze}
                disabled={!selectedFile || loading}
                className="btn btn-primary"
              >
                {loading ? (
                  <>
                    <Loader2 className="spinner" size={20} />
                    분석 중...
                  </>
                ) : (
                  '분석 시작'
                )}
              </button>

              {(selectedFile || result) && (
                <button onClick={handleReset} className="btn btn-secondary">
                  초기화
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 결과 섹션 */}
        {result && (
          <ErrorBoundary>
          <div className="result-section">
            <h2>분석 결과</h2>

            {/* 종합 판정 카드 */}
            <div className="result-card judgment-card">
              <div className="judgment-header">
                <h3>종합 판정</h3>
                {(() => {
                  const judgment = getJudgment(result.analysis_result?.risk_level)
                  return (
                    <span className={`judgment-badge ${judgment.className}`}>
                      {judgment.text}
                    </span>
                  )
                })()}
              </div>

              <div className="judgment-content">
                <div className="judgment-item">
                  <span className="judgment-label">총 위반 점수</span>
                  <span className={`judgment-value score-${result.analysis_result?.risk_level?.toLowerCase()}`}>
                    {result.analysis_result?.total_score || 0}점
                  </span>
                </div>

                <div className="judgment-item">
                  <span className="judgment-label">위험도 등급</span>
                  <span className={`judgment-value risk-badge-large risk-${result.analysis_result?.risk_level?.toLowerCase()}`}>
                    {result.analysis_result?.risk_level || 'UNKNOWN'}
                  </span>
                </div>

                <div className="judgment-item">
                  <span className="judgment-label">위반 건수</span>
                  <span className="judgment-value">
                    {result.analysis_result?.violation_count || 0}건
                  </span>
                </div>
              </div>

              <div className="judgment-summary">
                <p>{result.analysis_result?.summary}</p>
              </div>
            </div>

            {/* OCR 추출 텍스트 (하이라이팅) */}
            <div className="result-card">
              <h3>추출된 텍스트</h3>
              <div className="ocr-text-highlighted">
                {highlightKeywords(
                  result.ocr_result?.text || '텍스트 없음',
                  result.analysis_result?.violations || []
                )}
              </div>
              <p className="ocr-confidence">
                OCR 신뢰도: {(result.ocr_result?.confidence || 0).toFixed(1)}%
              </p>
            </div>

            {/* 위반 사항 상세 */}
            {result.analysis_result?.violations?.length > 0 && (
              <div className="result-card">
                <h3>위반 사항 상세 ({result.analysis_result.violation_count}건)</h3>
                <div className="violations-detail-list">
                  {result.analysis_result.violations.map((violation, index) => (
                    <div key={index} className="violation-detail-card">
                      <div className="violation-detail-header">
                        <span className={`violation-severity-badge ${violation.severity?.toLowerCase()}`}>
                          {violation.severity}
                        </span>
                        <span className="violation-keyword-main">{violation.keyword}</span>
                        <span className="violation-score-badge">{violation.total_score}점</span>
                      </div>

                      <div className="violation-detail-body">
                        <div className="violation-info-row">
                          <span className="info-label">분류:</span>
                          <span className="info-value">{violation.category}</span>
                        </div>

                        <div className="violation-info-row">
                          <span className="info-label">검출 횟수:</span>
                          <span className="info-value">
                            {violation.count}회
                            {violation.repetition_bonus > 0 && (
                              <span className="bonus-indicator"> (+{violation.repetition_bonus}점 가산)</span>
                            )}
                          </span>
                        </div>

                        <div className="violation-info-row">
                          <span className="info-label">관련 법규:</span>
                          <span className="info-value law-text">{violation.law}</span>
                        </div>

                        <div className="violation-description">
                          <span className="info-label">설명:</span>
                          <p className="info-value">{violation.description}</p>
                        </div>

                        {violation.context && (
                          <div className="violation-context">
                            <span className="info-label">문맥:</span>
                            <p className="context-text">...{violation.context}...</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI 분석 근거 */}
            {result.analysis_result?.ai_analysis && (
              <div className="result-card ai-analysis-card">
                <h3>AI 분석 근거 (GPT-4)</h3>
                <div className="ai-analysis-content">
                  <pre className="ai-analysis-text">{result.analysis_result.ai_analysis}</pre>
                </div>
              </div>
            )}
          </div>
          </ErrorBoundary>
        )}
      </main>

      {/* 푸터 */}
      <footer className="footer">
        <p>의료광고 AI 심의 시스템 MVP v1.0</p>
      </footer>
    </div>
  )
}

export default App
