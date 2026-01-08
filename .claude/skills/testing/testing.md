---
name: testing
description: 단위/통합/E2E 테스트 작성 가이드 (pytest, Jest, Playwright)
---

# 테스트 Skill

당신은 소프트웨어 테스트 전문가입니다.

## 작업 순서

1. **테스트 범위 결정**: 단위/통합/E2E 선택
2. **테스트 케이스 설계**: 정상/예외/경계 케이스
3. **테스트 코드 작성**: 명확한 구조와 어설션
4. **실행 및 검증**: 커버리지 확인

## 체크리스트

- [ ] 핵심 비즈니스 로직 테스트
- [ ] 정상 케이스 (Happy Path)
- [ ] 예외 케이스 (Error Cases)
- [ ] 경계 케이스 (Edge Cases)
- [ ] 모킹/스터빙 적절히 사용
- [ ] 테스트 독립성 보장
- [ ] 의미 있는 어설션 메시지

## 테스트 피라미드

```
        /\
       /E2E\        적음, 느림, 비용 높음
      /______\
     /Integration\
    /____________\
   /  Unit Tests  \  많음, 빠름, 비용 낮음
  /________________\
```

## Python pytest 패턴

### 기본 구조
```python
import pytest
from myapp.calculator import add, divide

class TestCalculator:
    """Calculator 단위 테스트"""

    def test_add_positive_numbers(self):
        """양수 덧셈 테스트"""
        assert add(2, 3) == 5

    def test_add_negative_numbers(self):
        """음수 덧셈 테스트"""
        assert add(-1, -2) == -3

    def test_divide_by_zero(self):
        """0으로 나누기 예외 테스트"""
        with pytest.raises(ZeroDivisionError):
            divide(10, 0)
```

### 파라미터화 테스트
```python
@pytest.mark.parametrize("input,expected", [
    (0, "zero"),
    (1, "one"),
    (2, "two"),
    (-1, "negative"),
])
def test_number_to_word(input, expected):
    assert number_to_word(input) == expected
```

### Fixture
```python
@pytest.fixture
def sample_user():
    """테스트용 사용자 객체"""
    return User(id=1, name="Test User", email="test@example.com")

@pytest.fixture
def db_session():
    """테스트용 DB 세션"""
    session = create_test_session()
    yield session
    session.rollback()
    session.close()

def test_user_creation(db_session, sample_user):
    db_session.add(sample_user)
    assert db_session.query(User).count() == 1
```

### 모킹
```python
from unittest.mock import patch, Mock, AsyncMock

def test_external_api_call():
    with patch('myapp.service.external_api') as mock_api:
        mock_api.return_value = {"status": "success"}
        result = my_function()
        assert result["status"] == "success"
        mock_api.assert_called_once()

# 비동기 모킹
@pytest.mark.asyncio
async def test_async_function():
    with patch('myapp.client.fetch', new_callable=AsyncMock) as mock:
        mock.return_value = {"data": "test"}
        result = await my_async_function()
        assert result == {"data": "test"}
```

### FastAPI 테스트
```python
from fastapi.testclient import TestClient
from myapp.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello World"}

def test_create_item():
    response = client.post(
        "/items/",
        json={"name": "Test Item", "price": 10.0}
    )
    assert response.status_code == 201
    assert response.json()["name"] == "Test Item"
```

## JavaScript/TypeScript Jest 패턴

### 기본 구조
```typescript
import { add, divide } from './calculator';

describe('Calculator', () => {
  describe('add', () => {
    it('should add positive numbers', () => {
      expect(add(2, 3)).toBe(5);
    });

    it('should handle negative numbers', () => {
      expect(add(-1, -2)).toBe(-3);
    });
  });

  describe('divide', () => {
    it('should throw on division by zero', () => {
      expect(() => divide(10, 0)).toThrow('Division by zero');
    });
  });
});
```

### 비동기 테스트
```typescript
describe('API calls', () => {
  it('should fetch user data', async () => {
    const user = await fetchUser(1);
    expect(user).toHaveProperty('name');
    expect(user.id).toBe(1);
  });

  it('should handle errors', async () => {
    await expect(fetchUser(-1)).rejects.toThrow('User not found');
  });
});
```

### 모킹
```typescript
jest.mock('./api');

import { fetchData } from './api';

const mockFetchData = fetchData as jest.MockedFunction<typeof fetchData>;

beforeEach(() => {
  mockFetchData.mockReset();
});

it('should process fetched data', async () => {
  mockFetchData.mockResolvedValue({ items: [1, 2, 3] });

  const result = await processData();

  expect(result.total).toBe(6);
  expect(mockFetchData).toHaveBeenCalledTimes(1);
});
```

### React 컴포넌트 테스트
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);

    fireEvent.click(screen.getByText('Click'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## E2E 테스트 (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'user@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('.welcome-message')).toContainText('Welcome');
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-message')).toBeVisible();
  });
});
```

## 테스트 실행

```bash
# Python
pytest                          # 전체 실행
pytest tests/test_api.py        # 특정 파일
pytest -k "test_login"          # 패턴 매칭
pytest --cov=src                # 커버리지
pytest -v                       # 상세 출력

# JavaScript
npm test                        # 전체 실행
npm test -- --watch             # 워치 모드
npm test -- --coverage          # 커버리지
npm test -- path/to/file.test.ts  # 특정 파일

# Playwright
npx playwright test             # 전체 실행
npx playwright test --ui        # UI 모드
npx playwright test --debug     # 디버그 모드
```

## 사용 도구

- `read`: 테스트 대상 코드 확인
- `bash`: 테스트 실행
- `edit`: 테스트 코드 작성

## 예시

**요청**: "사용자 서비스 단위 테스트 작성"

**테스트 케이스**:
1. 정상: 유효한 데이터로 사용자 생성
2. 예외: 중복 이메일로 생성 시도
3. 예외: 필수 필드 누락
4. 경계: 최대 길이 이름
