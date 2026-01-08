---
name: type-safety
description: TypeScript/Python 타입 안전성 및 일관성 가이드
---

# 타입 안전성 Skill

당신은 TypeScript/Python 타입 시스템 전문가입니다.

## 작업 순서

1. **타입 분석**: 데이터 흐름과 필요한 타입 파악
2. **타입 정의**: 인터페이스/타입 별칭 작성
3. **적용**: 함수, 변수, 클래스에 타입 적용
4. **검증**: 타입 체크 실행 및 오류 수정

## 체크리스트

- [ ] `any` 타입 사용 최소화
- [ ] Union 타입으로 가능한 값 제한
- [ ] Optional 필드 명시적 표기
- [ ] 제네릭으로 재사용성 확보
- [ ] API 요청/응답 타입 정의
- [ ] Frontend/Backend 타입 동기화

## TypeScript 타입 패턴

### 기본 타입 정의
```typescript
// 인터페이스 (객체 구조)
interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  profile?: UserProfile;  // optional
}

// 타입 별칭 (유니온, 프리미티브)
type UserRole = 'admin' | 'user' | 'guest';
type UserId = string;

// Enum (상수 집합)
enum Status {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}
```

### 유틸리티 타입
```typescript
// Partial - 모든 필드 optional
type UserUpdate = Partial<User>;

// Pick - 특정 필드만 선택
type UserSummary = Pick<User, 'id' | 'name'>;

// Omit - 특정 필드 제외
type UserCreate = Omit<User, 'id' | 'createdAt'>;

// Required - 모든 필드 필수
type RequiredUser = Required<User>;

// Record - 키-값 매핑
type UserMap = Record<UserId, User>;
```

### 제네릭 패턴
```typescript
// API 응답 래퍼
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// 페이지네이션
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 사용
type UsersResponse = ApiResponse<User[]>;
type PaginatedUsers = PaginatedResponse<User>;
```

### 조건부 타입
```typescript
// null 체크
type NonNullable<T> = T extends null | undefined ? never : T;

// 배열 요소 타입 추출
type ArrayElement<T> = T extends (infer E)[] ? E : never;
```

## Python 타입 힌트

### 기본 타입
```python
from typing import Optional, List, Dict, Union
from dataclasses import dataclass
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"

@dataclass
class User:
    id: str
    email: str
    name: str
    role: UserRole
    profile: Optional["UserProfile"] = None
```

### Pydantic 모델
```python
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    role: UserRole = UserRole.USER

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole

    class Config:
        from_attributes = True  # ORM 모델 변환
```

### 제네릭 (Python)
```python
from typing import TypeVar, Generic

T = TypeVar('T')

class ApiResponse(Generic[T]):
    def __init__(self, data: T, success: bool = True):
        self.data = data
        self.success = success
```

## Frontend/Backend 동기화

### 공통 타입 정의
```typescript
// shared/types.ts (또는 각 프로젝트에 복사)
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'guest';
}

export interface ApiError {
  code: string;
  message: string;
}
```

### API 응답 타입
```typescript
// Frontend
interface GetUsersResponse {
  success: boolean;
  users: User[];
  total: number;
}

// Backend (Python)
class GetUsersResponse(BaseModel):
    success: bool
    users: List[UserResponse]
    total: int
```

## 타입 가드

### TypeScript
```typescript
// 타입 가드 함수
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj
  );
}

// 사용
if (isUser(data)) {
  console.log(data.email);  // 타입 안전
}
```

### Discriminated Union
```typescript
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function handleResult(result: Result<User>) {
  if (result.success) {
    console.log(result.data.name);  // 타입 안전
  } else {
    console.log(result.error);
  }
}
```

## 타입 검사 실행

```bash
# TypeScript
npx tsc --noEmit

# Python (mypy)
mypy src/ --strict
```

## 사용 도구

- `read`: 타입 정의 파일 확인
- `grep`: 타입 사용처 검색
- `bash`: 타입 체크 실행

## 예시

**문제**: API 응답에 새 필드 추가

**작업**:
1. Backend Pydantic 모델에 필드 추가
2. Frontend TypeScript 인터페이스 동기화
3. 사용하는 컴포넌트 업데이트
4. `tsc --noEmit`으로 검증
