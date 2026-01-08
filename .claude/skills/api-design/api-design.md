---
name: api-design
description: REST API 설계 및 구현 가이드 (FastAPI/Express/Flask)
---

# API 설계 Skill

당신은 REST API 설계 전문가입니다.

## 작업 순서

1. **요구사항 분석**: 필요한 리소스와 액션 파악
2. **엔드포인트 설계**: RESTful 원칙에 따른 URL 구조
3. **스키마 정의**: 요청/응답 데이터 구조
4. **구현**: 핸들러 작성 및 검증 로직
5. **문서화**: OpenAPI/Swagger 명세

## 체크리스트

- [ ] RESTful URL 명명 (복수형 명사: `/api/users`, `/api/posts`)
- [ ] 적절한 HTTP 메서드 (GET/POST/PUT/PATCH/DELETE)
- [ ] 요청/응답 스키마 정의 (Pydantic, Zod, JSON Schema)
- [ ] HTTP 상태 코드 일관성 (200, 201, 400, 404, 500)
- [ ] 에러 응답 구조 통일
- [ ] 인증/인가 처리
- [ ] 입력값 검증

## RESTful 설계 원칙

### URL 구조
```
GET    /api/resources          # 목록 조회
GET    /api/resources/:id      # 단일 조회
POST   /api/resources          # 생성
PUT    /api/resources/:id      # 전체 수정
PATCH  /api/resources/:id      # 부분 수정
DELETE /api/resources/:id      # 삭제
```

### 중첩 리소스
```
GET    /api/users/:userId/posts     # 사용자의 글 목록
POST   /api/users/:userId/posts     # 사용자의 글 생성
```

### 쿼리 파라미터
```
GET /api/posts?page=1&limit=10      # 페이지네이션
GET /api/posts?sort=created_at&order=desc  # 정렬
GET /api/posts?status=published     # 필터링
GET /api/posts?q=keyword            # 검색
```

## HTTP 상태 코드

| 코드 | 의미 | 사용 상황 |
|-----|------|----------|
| 200 | OK | 조회/수정 성공 |
| 201 | Created | 생성 성공 |
| 204 | No Content | 삭제 성공 |
| 400 | Bad Request | 잘못된 요청 (검증 실패) |
| 401 | Unauthorized | 인증 필요 |
| 403 | Forbidden | 권한 없음 |
| 404 | Not Found | 리소스 없음 |
| 409 | Conflict | 중복/충돌 |
| 422 | Unprocessable Entity | 검증 실패 (상세) |
| 500 | Internal Server Error | 서버 오류 |

## 응답 구조 패턴

### 성공 응답
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "total": 100
  }
}
```

### 에러 응답
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값이 올바르지 않습니다",
    "details": [
      { "field": "email", "message": "유효한 이메일 형식이 아닙니다" }
    ]
  }
}
```

## 프레임워크별 패턴

### FastAPI (Python)
```python
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel

class UserCreate(BaseModel):
    email: str
    name: str

class UserResponse(BaseModel):
    id: int
    email: str
    name: str

@app.post("/api/users", response_model=UserResponse, status_code=201)
async def create_user(user: UserCreate):
    # 구현
    return created_user
```

### Express (Node.js)
```javascript
app.post('/api/users', async (req, res) => {
  try {
    const user = await UserService.create(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
```

## 페이지네이션 패턴

### Offset 기반
```
GET /api/posts?page=2&limit=20
```

### Cursor 기반 (대용량)
```
GET /api/posts?cursor=abc123&limit=20
```

## 버전 관리

```
/api/v1/users
/api/v2/users
```

또는 헤더 사용:
```
Accept: application/vnd.api+json; version=2
```

## 사용 도구

- `read`: 기존 API 코드 확인
- `grep`: API 패턴 검색 (`@app.get`, `router.post` 등)
- `edit`: API 코드 수정

## 예시

**요청**: "사용자 CRUD API 설계"

**설계**:
```
GET    /api/users           # 목록
GET    /api/users/:id       # 상세
POST   /api/users           # 생성
PATCH  /api/users/:id       # 수정
DELETE /api/users/:id       # 삭제
```
