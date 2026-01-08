---
name: frontend-component
description: React/Next.js 컴포넌트 설계 및 구현 가이드
---

# Frontend 컴포넌트 Skill

당신은 React/Next.js 프론트엔드 개발 전문가입니다.

## 작업 순서

1. **컴포넌트 설계**: 책임과 Props 인터페이스 정의
2. **타입 정의**: TypeScript 인터페이스 작성
3. **상태 관리**: useState, useReducer, 전역 상태 결정
4. **구현**: 컴포넌트 코드 작성
5. **스타일링**: CSS/Tailwind/CSS-in-JS 적용

## 체크리스트

- [ ] Props 인터페이스 정의 (TypeScript)
- [ ] 적절한 컴포넌트 분리 (단일 책임)
- [ ] 로딩/에러/빈 상태 처리
- [ ] 접근성 (aria-label, role, 키보드 네비게이션)
- [ ] 반응형 디자인
- [ ] 메모이제이션 필요성 검토 (React.memo, useMemo, useCallback)

## 컴포넌트 구조 패턴

### 폴더 구조
```
components/
├── ui/                 # 공통 UI (Button, Input, Modal)
├── layout/             # 레이아웃 (Header, Footer, Sidebar)
├── features/           # 기능별 컴포넌트
│   ├── auth/
│   ├── posts/
│   └── users/
└── pages/              # 페이지 컴포넌트 (또는 app/ 사용)
```

### 컴포넌트 파일 구조
```
Button/
├── Button.tsx          # 컴포넌트
├── Button.test.tsx     # 테스트
├── Button.stories.tsx  # Storybook
└── index.ts            # export
```

## 컴포넌트 작성 패턴

### 기본 구조
```tsx
'use client'; // Next.js App Router (필요시)

import { useState, useEffect } from 'react';

interface UserCardProps {
  user: User;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

export default function UserCard({
  user,
  onEdit,
  onDelete,
  className = ''
}: UserCardProps) {
  // 상태
  const [isLoading, setIsLoading] = useState(false);

  // 이펙트
  useEffect(() => {
    // 사이드 이펙트
  }, [dependency]);

  // 핸들러
  const handleEdit = () => {
    onEdit?.(user.id);
  };

  // 렌더링
  return (
    <div className={`user-card ${className}`}>
      <h3>{user.name}</h3>
      <button onClick={handleEdit}>Edit</button>
    </div>
  );
}
```

### 상태별 렌더링
```tsx
function DataList({ data, isLoading, error }) {
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!data || data.length === 0) {
    return <EmptyState message="데이터가 없습니다" />;
  }

  return (
    <ul>
      {data.map(item => <ListItem key={item.id} item={item} />)}
    </ul>
  );
}
```

## 커스텀 훅 패턴

### 데이터 페칭 훅
```tsx
function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const data = await api.getUsers();
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류 발생');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return { users, isLoading, error, refetch: fetchUsers };
}
```

### 폼 훅
```tsx
function useForm<T>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const handleChange = (field: keyof T) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setValues(prev => ({ ...prev, [field]: e.target.value }));
  };

  const reset = () => setValues(initialValues);

  return { values, errors, handleChange, setErrors, reset };
}
```

## 성능 최적화

### React.memo
```tsx
const ExpensiveList = React.memo(function ExpensiveList({ items }) {
  return items.map(item => <Item key={item.id} {...item} />);
});
```

### useMemo / useCallback
```tsx
// 비용이 큰 계산
const sortedItems = useMemo(() =>
  items.sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);

// 콜백 메모이제이션
const handleClick = useCallback((id: string) => {
  onSelect(id);
}, [onSelect]);
```

## 접근성

```tsx
<button
  aria-label="닫기"
  aria-pressed={isOpen}
  onClick={handleClose}
>
  <CloseIcon aria-hidden="true" />
</button>

<input
  id="email"
  aria-describedby="email-hint"
  aria-invalid={!!error}
/>
<p id="email-hint">이메일 형식으로 입력하세요</p>
```

## 사용 도구

- `glob`: `components/**/*.tsx` 파일 검색
- `read`: 기존 컴포넌트 패턴 확인
- `edit`: 컴포넌트 코드 수정

## 예시

**요청**: "모달 컴포넌트 추가"

**구현**:
1. `components/ui/Modal.tsx` 생성
2. Props: `isOpen`, `onClose`, `title`, `children`
3. 외부 클릭 시 닫기, ESC 키 지원
4. 포커스 트랩 구현
