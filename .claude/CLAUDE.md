# MED-AD-REV 프로젝트 컨텍스트

## 프로젝트 개요

**의료광고 심의 자동화 시스템** - 의료광고 이미지를 OCR로 텍스트 추출 후 의료법 위반 여부를 자동 분석하는 시스템

## 기술 스택

| 구분 | 기술 |
|------|------|
| Backend | FastAPI (Python 3.12) |
| Frontend | Next.js 14 (TypeScript) |
| OCR | Naver Clova OCR, PaddleOCR |
| AI | OpenAI GPT-4 |
| Vector DB | Chroma (로컬) |
| Embedding | OpenAI text-embedding-3-small |

## 프로젝트 구조

```
MED-AD-REV/
├── src/
│   ├── backend/
│   │   ├── main.py              # FastAPI 엔드포인트
│   │   ├── ad_analyzer.py       # 분석 로직 (3단계 파이프라인)
│   │   ├── medical_keywords.py  # 금지 키워드 DB
│   │   ├── paddle_ocr.py        # PaddleOCR 엔진
│   │   ├── rag/                  # RAG 모듈
│   │   │   ├── vector_store.py  # Chroma 벡터 DB
│   │   │   └── retriever.py     # 법규 검색
│   │   └── data/                 # RAG 문서 저장소
│   └── frontend/
│       ├── app/                  # Next.js App Router
│       ├── components/           # React 컴포넌트
│       ├── lib/api.ts           # API 클라이언트
│       └── types/index.ts       # TypeScript 타입 정의
├── docs/                         # 문서
└── venv/                         # Python 가상환경
```

## 핵심 원칙

### 1. 단일 진실 원칙 (SSOT)

위험점수 → 위험도 → 판정 자동 계산:

| 위험점수 | 위험도 | 판정 |
|---------|--------|------|
| -1 | N/A | 불필요 |
| 0-10 | SAFE | 통과 |
| 11-30 | LOW | 주의 |
| 31-60 | MEDIUM | 수정제안 |
| 61-80 | HIGH | 수정권고 |
| 81-100 | CRITICAL | 게재불가 |

### 2. 3단계 분석 파이프라인

```
1단계: 키워드 분석 (로컬, 빠름)
   ↓
2단계: 1차 AI 심층분석 (GPT-4, 자유 형식)
   ↓
3단계: 2차 LLM 판정 추출 (GPT-4-mini, JSON)
```

### 3. 타입 안전성

- Frontend: `types/index.ts`에 모든 타입 중앙 정의
- Backend: Pydantic 모델로 요청/응답 검증
- Enum 사용: `OCREngine`, `RiskLevel`, `JudgmentType`

### 4. 보안

- 경로 Traversal 방지: `Path(filename).name`
- 파일 확장자/크기 검증
- 환경변수로 API 키 관리

### 5. 비동기 처리

- `async/await` 패턴 일관 사용
- `asyncio.Semaphore`로 동시 처리 제한
- OCR 엔진별 제한: Naver 5개, Paddle 50개

## 개발 서버

| 서비스 | URL | 실행 명령 |
|--------|-----|----------|
| Backend | http://localhost:8000 | `cd src/backend && source ../../venv/bin/activate && uvicorn main:app --reload --port 8000` |
| Frontend | http://localhost:5173 | `cd src/frontend && npm run dev -- -p 5173` |

## 주요 API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/ocr-analyze` | 단일 이미지 OCR + 분석 |
| POST | `/api/batch-upload-analyze` | 다중 이미지 배치 분석 |
| GET | `/api/batch-status/{batch_id}` | 배치 진행 상태 조회 |
| GET | `/api/admin/documents` | RAG 문서 목록 |
| POST | `/api/admin/documents` | RAG 문서 업로드 |

## 개발 시 주의사항

1. **하위 호환성 유지**: 기존 API 응답 구조 변경 시 `total_score` 같은 별칭 유지
2. **RAG Lazy Loading**: 벡터 DB는 필요 시에만 초기화
3. **파일별 상태 추적**: 배치 처리 시 `FileStatus`로 개별 진행률 표시
4. **OCR 엔진별 제한**: 프론트엔드에서 즉시 피드백 제공

## Skills

`.claude/skills/` 폴더에 범용 개발 가이드가 포함되어 있습니다:

| Skill | 설명 |
|-------|------|
| `api-design` | REST API 설계 패턴 |
| `backend-development` | Python/Node.js 백엔드 개발 |
| `frontend-component` | React/Next.js 컴포넌트 패턴 |
| `type-safety` | TypeScript/Python 타입 안전성 |
| `security-review` | OWASP 기반 보안 체크리스트 |
| `async-processing` | 비동기 처리 패턴 |
| `code-review` | 코드 리뷰 체크리스트 |
| `rag-integration` | RAG 시스템 구축 가이드 |
| `testing` | pytest/Jest/Playwright 테스트 |

## 관련 문서

- `docs/PRD/` - 기능 요구사항
- `docs/architecture/` - 시스템 설계
- `src/backend/README_API.md` - API 상세 문서
