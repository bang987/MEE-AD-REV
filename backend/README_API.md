# Medical Advertisement Review API

FastAPI 기반 의료 광고 리뷰 및 OCR 분석 API

## 서버 정보

- **Base URL**: `http://192.168.0.2:8000`
- **API 문서**: `http://192.168.0.2:8000/docs` (Swagger UI)
- **Alternative 문서**: `http://192.168.0.2:8000/redoc` (ReDoc)

## 엔드포인트

### 1. 헬스 체크

#### `GET /health`

서버 상태 확인

**응답 예시:**
```json
{
  "status": "healthy",
  "message": "All systems operational",
  "timestamp": "2026-01-04T21:35:58.829210"
}
```

### 2. 단일 이미지 OCR

#### `POST /api/ocr`

단일 이미지 파일에서 텍스트 추출

**요청:**
- Content-Type: `multipart/form-data`
- 파라미터:
  - `file`: 이미지 파일 (jpg, jpeg, png)

**응답 예시:**
```json
{
  "success": true,
  "text": "추출된 텍스트 내용...",
  "confidence": 0.98,
  "fields_count": 127,
  "error": null,
  "filename": "가슴성형.jpg",
  "processing_time": 2.107373
}
```

**cURL 예시:**
```bash
curl -X POST "http://192.168.0.2:8000/api/ocr" \
  -F "file=@image.jpg"
```

**Python 예시:**
```python
import requests

url = "http://192.168.0.2:8000/api/ocr"
files = {"file": open("image.jpg", "rb")}
response = requests.post(url, files=files)
result = response.json()

print(f"추출된 텍스트: {result['text']}")
print(f"신뢰도: {result['confidence']}")
```

### 3. 배치 이미지 OCR

#### `POST /api/ocr/batch`

여러 이미지 파일에서 텍스트 일괄 추출 (최대 10개)

**요청:**
- Content-Type: `multipart/form-data`
- 파라미터:
  - `files`: 이미지 파일 목록 (최대 10개)

**응답 예시:**
```json
[
  {
    "success": true,
    "text": "추출된 텍스트 1...",
    "confidence": 1.0,
    "fields_count": 7,
    "error": null,
    "filename": "image1.jpg",
    "processing_time": 0.995811
  },
  {
    "success": true,
    "text": "추출된 텍스트 2...",
    "confidence": 0.98,
    "fields_count": 32,
    "error": null,
    "filename": "image2.jpg",
    "processing_time": 1.124536
  }
]
```

**cURL 예시:**
```bash
curl -X POST "http://192.168.0.2:8000/api/ocr/batch" \
  -F "files=@image1.jpg" \
  -F "files=@image2.jpg" \
  -F "files=@image3.jpg"
```

**Python 예시:**
```python
import requests

url = "http://192.168.0.2:8000/api/ocr/batch"
files = [
    ("files", open("image1.jpg", "rb")),
    ("files", open("image2.jpg", "rb")),
    ("files", open("image3.jpg", "rb"))
]
response = requests.post(url, files=files)
results = response.json()

for result in results:
    print(f"{result['filename']}: {result['text'][:100]}...")
```

### 4. 이미지 OCR + 광고 위반 분석 (통합)

#### `POST /api/ocr-analyze`

이미지 OCR + 광고 위반 분석을 한번에 수행

**요청:**
- Content-Type: `multipart/form-data`
- 파라미터:
  - `file`: 이미지 파일 (jpg, jpeg, png)
  - `use_ai`: AI 분석 사용 여부 (선택, 기본값: false)

**응답 예시:**
```json
{
  "success": true,
  "ocr_result": {
    "text": "피부과 보톡스 주름 개선 50% 할인",
    "confidence": 98.9,
    "fields_count": 15,
    "processing_time": 1.2
  },
  "analysis_result": {
    "violations": [
      {
        "keyword": "보톡스",
        "category": "시술명 노출",
        "severity": "MEDIUM",
        "law": "의료법 시행령 제27조 제1항",
        "description": "의료광고에 시술명을 직접 노출할 수 없습니다",
        "base_score": 10,
        "count": 1,
        "repetition_bonus": 0,
        "total_score": 10
      }
    ],
    "total_score": 15,
    "risk_level": "LOW",
    "summary": "1개의 위반 사항이 발견되었습니다. 주의가 필요합니다.",
    "ai_analysis": "GPT-4 분석 결과 (use_ai=true인 경우)",
    "violation_count": 1
  },
  "filename": "보톡스.jpg"
}
```

**cURL 예시:**
```bash
# AI 분석 미포함
curl -X POST "http://192.168.0.2:8000/api/ocr-analyze" \
  -F "file=@보톡스.jpg" \
  -F "use_ai=false"

# AI 분석 포함
curl -X POST "http://192.168.0.2:8000/api/ocr-analyze" \
  -F "file=@보톡스.jpg" \
  -F "use_ai=true"
```

**Python 예시:**
```python
import requests

url = "http://192.168.0.2:8000/api/ocr-analyze"
files = {"file": open("보톡스.jpg", "rb")}
data = {"use_ai": "true"}

response = requests.post(url, files=files, data=data)
result = response.json()

print(f"위험도: {result['analysis_result']['risk_level']}")
print(f"총점: {result['analysis_result']['total_score']}")
print(f"위반 건수: {result['analysis_result']['violation_count']}")
```

---

### 5. 배치 분석 (다중 파일 병렬 처리)

#### `POST /api/batch-upload-analyze`

최대 50개 파일을 동시에 업로드하여 병렬로 분석 (비동기 백그라운드 처리)

**요청:**
- Content-Type: `multipart/form-data`
- 파라미터:
  - `files`: 이미지 파일 목록 (최대 50개)
  - `use_ai`: AI 분석 사용 여부 (선택, 기본값: false)

**응답 예시:**
```json
{
  "success": true,
  "batch_id": "batch_20260105_143022_a7b3c9d1",
  "total_files": 10,
  "message": "배치 분석이 시작되었습니다. /api/batch-status/{batch_id}로 진행 상태를 확인하세요."
}
```

**cURL 예시:**
```bash
curl -X POST "http://192.168.0.2:8000/api/batch-upload-analyze" \
  -F "files=@image1.jpg" \
  -F "files=@image2.jpg" \
  -F "files=@image3.jpg" \
  -F "use_ai=false"
```

**Python 예시:**
```python
import requests
import glob

url = "http://192.168.0.2:8000/api/batch-upload-analyze"

# 여러 파일 선택
image_files = glob.glob("images/*.jpg")[:10]
files = [("files", open(f, "rb")) for f in image_files]
data = {"use_ai": "false"}

response = requests.post(url, files=files, data=data)
result = response.json()

batch_id = result["batch_id"]
print(f"Batch ID: {batch_id}")
print(f"총 파일 수: {result['total_files']}")
```

**주요 특징:**
- 최대 50개 파일 동시 처리
- 비동기 백그라운드 처리 (즉시 batch_id 반환)
- 병렬 처리: 최대 5개 동시 실행 (asyncio.Semaphore)
- 처리 시간: AI 미포함 ~2초/파일, AI 포함 ~15초/파일

---

### 6. 배치 분석 상태 조회

#### `GET /api/batch-status/{batch_id}`

배치 분석의 진행 상태 및 결과 조회 (Polling용)

**요청:**
- URL 파라미터: `batch_id` (배치 ID)

**응답 예시 (처리 중):**
```json
{
  "batch_id": "batch_20260105_143022_a7b3c9d1",
  "status": "processing",
  "total_files": 10,
  "processed_files": 7,
  "progress_percent": 70.0,
  "results": [
    {
      "filename": "image1.jpg",
      "success": true,
      "ocr_result": { "text": "...", "confidence": 98.9 },
      "analysis_result": { "total_score": 15, "risk_level": "LOW", ... }
    },
    ...
  ],
  "errors": []
}
```

**응답 예시 (완료):**
```json
{
  "batch_id": "batch_20260105_143022_a7b3c9d1",
  "status": "completed",
  "total_files": 10,
  "processed_files": 10,
  "progress_percent": 100.0,
  "results": [ ... ],
  "errors": []
}
```

**cURL 예시:**
```bash
curl -X GET "http://192.168.0.2:8000/api/batch-status/batch_20260105_143022_a7b3c9d1"
```

**Python 예시 (Polling):**
```python
import requests
import time

batch_id = "batch_20260105_143022_a7b3c9d1"
url = f"http://192.168.0.2:8000/api/batch-status/{batch_id}"

while True:
    response = requests.get(url)
    status = response.json()

    print(f"진행률: {status['progress_percent']:.1f}% ({status['processed_files']}/{status['total_files']})")

    if status["status"] == "completed":
        print("배치 분석 완료!")
        results = status["results"]
        break
    elif status["status"] == "failed":
        print("배치 분석 실패:", status["errors"])
        break

    time.sleep(2)  # 2초마다 폴링
```

**상태 값:**
- `processing`: 처리 중
- `completed`: 완료
- `failed`: 실패

---

### 7. 파일 자동 분류

#### `POST /api/classify-files`

분석 결과에 따라 파일을 자동으로 분류하여 이동
- SAFE, LOW → `uploads/approved/`
- HIGH, CRITICAL → `uploads/rejected/`
- MEDIUM → `uploads/review/`

**요청:**
- Content-Type: `application/json`
- Body:
```json
{
  "batch_id": "batch_20260105_143022_a7b3c9d1",
  "classifications": [
    {
      "filename": "image1.jpg",
      "category": "approved"
    },
    {
      "filename": "image2.jpg",
      "category": "rejected"
    },
    {
      "filename": "image3.jpg",
      "category": "review"
    }
  ]
}
```

**응답 예시:**
```json
{
  "success": true,
  "batch_id": "batch_20260105_143022_a7b3c9d1",
  "total_files": 10,
  "success_count": 9,
  "failed_count": 1,
  "errors": [
    "image10.jpg: 파일을 찾을 수 없습니다."
  ]
}
```

**cURL 예시:**
```bash
curl -X POST "http://192.168.0.2:8000/api/classify-files" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": "batch_20260105_143022_a7b3c9d1",
    "classifications": [
      {"filename": "image1.jpg", "category": "approved"},
      {"filename": "image2.jpg", "category": "rejected"}
    ]
  }'
```

**Python 예시:**
```python
import requests

url = "http://192.168.0.2:8000/api/classify-files"

# 분석 결과 기반 자동 분류
def get_category(risk_level):
    if risk_level in ["SAFE", "LOW"]:
        return "approved"
    elif risk_level in ["HIGH", "CRITICAL"]:
        return "rejected"
    else:
        return "review"

# 분류 데이터 생성
classifications = [
    {
        "filename": result["filename"],
        "category": get_category(result["analysis_result"]["risk_level"])
    }
    for result in batch_results["results"]
]

data = {
    "batch_id": "batch_20260105_143022_a7b3c9d1",
    "classifications": classifications
}

response = requests.post(url, json=data)
result = response.json()

print(f"성공: {result['success_count']}개")
print(f"실패: {result['failed_count']}개")
```

**분류 카테고리:**
- `approved`: 통과 (SAFE, LOW)
- `rejected`: 반려 (HIGH, CRITICAL)
- `review`: 검토 필요 (MEDIUM)

---

## 응답 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `success` | boolean | OCR 처리 성공 여부 |
| `text` | string | 추출된 텍스트 (성공 시) |
| `confidence` | float | 평균 신뢰도 (0.0 ~ 1.0) |
| `fields_count` | integer | 인식된 텍스트 필드 개수 |
| `error` | string | 오류 메시지 (실패 시) |
| `filename` | string | 업로드된 파일명 |
| `processing_time` | float | 처리 시간 (초) |

## 오류 코드

| 상태 코드 | 설명 |
|----------|------|
| 200 | 성공 |
| 400 | 잘못된 요청 (지원하지 않는 파일 형식, 파일 개수 초과 등) |
| 500 | 서버 오류 (OCR API 설정 오류, 처리 중 오류 등) |

## 서버 실행

### 개발 모드
```bash
# 가상환경 활성화
source ../venv/bin/activate

# 직접 실행
python main.py

# 또는 uvicorn 사용
uvicorn main:app --reload --host 192.168.0.2 --port 8000
```

### 프로덕션 모드
```bash
# 가상환경 활성화
source ../venv/bin/activate

# uvicorn으로 실행
uvicorn main:app --host 192.168.0.2 --port 8000 --workers 4
```

## 환경 변수 (.env)

```env
# Naver Clova OCR
NAVER_OCR_API_URL=https://3n6tqye20o.apigw.ntruss.com/custom/v1/.../general
NAVER_OCR_SECRET_KEY=your_secret_key_here

# Server Configuration
SERVER_HOST=192.168.0.2
SERVER_PORT=8000
```

## 테스트

테스트 스크립트 실행:
```bash
python test_api.py
```

## 기술 스택

- **FastAPI**: 웹 프레임워크
- **Uvicorn**: ASGI 서버
- **Naver Clova OCR**: OCR 엔진
- **GPT-4**: AI 법규 분석 (OpenAI API)
- **Python 3.12**: 프로그래밍 언어
- **Pydantic**: 데이터 검증
- **asyncio**: 비동기 병렬 처리

## 참고 사항

### 파일 처리
- 지원 이미지 형식: JPG, JPEG, PNG
- 단일 파일 최대 크기: 10MB
- 배치 처리 최대 파일 수:
  - `/api/ocr/batch`: 10개 (순차 처리)
  - `/api/batch-upload-analyze`: 50개 (병렬 처리)
- OCR 요청 타임아웃: 30초
- 개별 파일 분석 타임아웃: 60초

### 병렬 처리
- 최대 동시 처리 수: 5개 (asyncio.Semaphore)
- 폴링 권장 간격: 2초
- 배치 상태 저장: 메모리 + JSON 백업

### 파일 저장 위치
- 임시 파일: `uploads/temp/{batch_id}/`
- 통과 파일: `uploads/approved/` (SAFE, LOW)
- 반려 파일: `uploads/rejected/` (HIGH, CRITICAL)
- 검토 파일: `uploads/review/` (MEDIUM)
- 배치 결과: `uploads/batch_results/{batch_id}.json`

### 처리 시간 (평균)
- 단일 OCR: 1-3초
- 단일 OCR + 키워드 분석: 2-4초
- 단일 OCR + 키워드 + AI 분석: 15-20초
- 배치 분석 (50개, AI 미포함): ~20초 (병렬)
- 배치 분석 (50개, AI 포함): ~150초 (병렬)

### 위험도 분류 기준
| 위험도 | 총점 범위 | 분류 폴더 |
|--------|----------|-----------|
| SAFE | 0점 | approved |
| LOW | 1-30점 | approved |
| MEDIUM | 31-60점 | review |
| HIGH | 61-100점 | rejected |
| CRITICAL | 101점 이상 | rejected |
