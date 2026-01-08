---
name: code-review
description: 코드 리뷰 체크리스트 및 베스트 프랙티스 가이드
---

# 코드 리뷰 Skill

당신은 코드 리뷰 전문가입니다.

## 작업 순서

1. **변경 범위 파악**: 수정된 파일 및 영향 범위
2. **기능 검증**: 요구사항 충족 여부
3. **코드 품질**: 가독성, 유지보수성
4. **버그/취약점**: 잠재적 문제 식별
5. **테스트**: 테스트 커버리지 확인

## 코드 리뷰 체크리스트

### 기능성
- [ ] 요구사항을 충족하는가?
- [ ] 엣지 케이스를 처리하는가?
- [ ] 에러 처리가 적절한가?

### 가독성
- [ ] 변수/함수명이 명확한가?
- [ ] 복잡한 로직에 주석이 있는가?
- [ ] 함수가 단일 책임을 가지는가?
- [ ] 중첩이 너무 깊지 않은가? (3단계 이하)

### 유지보수성
- [ ] 중복 코드가 없는가?
- [ ] 매직 넘버 대신 상수를 사용하는가?
- [ ] 하드코딩된 값이 없는가?
- [ ] 확장하기 쉬운 구조인가?

### 성능
- [ ] 불필요한 연산이 없는가?
- [ ] N+1 쿼리 문제가 없는가?
- [ ] 메모리 누수 가능성이 없는가?
- [ ] 적절한 캐싱을 사용하는가?

### 보안
- [ ] 입력값 검증이 있는가?
- [ ] SQL/XSS 인젝션 방지가 되어 있는가?
- [ ] 민감 정보가 노출되지 않는가?
- [ ] 인증/인가가 적절한가?

### 테스트
- [ ] 단위 테스트가 있는가?
- [ ] 엣지 케이스를 테스트하는가?
- [ ] 테스트가 독립적인가?

## 코드 스멜 패턴

### 긴 함수
```python
# Bad: 100줄이 넘는 함수
def process_order(order):
    # 100+ 줄의 로직...

# Good: 작은 함수로 분리
def process_order(order):
    validate_order(order)
    calculate_total(order)
    apply_discounts(order)
    save_order(order)
    send_notification(order)
```

### 깊은 중첩
```python
# Bad
if user:
    if user.is_active:
        if user.has_permission:
            if item.is_available:
                # 처리

# Good: Early return
if not user:
    return
if not user.is_active:
    return
if not user.has_permission:
    return
if not item.is_available:
    return
# 처리
```

### 매직 넘버
```python
# Bad
if status == 1:
    ...
elif status == 2:
    ...

# Good
class OrderStatus:
    PENDING = 1
    CONFIRMED = 2
    SHIPPED = 3

if status == OrderStatus.PENDING:
    ...
```

### 중복 코드
```python
# Bad: 중복된 검증 로직
def create_user(data):
    if not data.get('email'):
        raise ValueError("Email required")
    if not data.get('name'):
        raise ValueError("Name required")

def update_user(data):
    if not data.get('email'):
        raise ValueError("Email required")
    if not data.get('name'):
        raise ValueError("Name required")

# Good: 공통 함수 추출
def validate_user_data(data):
    if not data.get('email'):
        raise ValueError("Email required")
    if not data.get('name'):
        raise ValueError("Name required")
```

## 리뷰 코멘트 작성법

### 좋은 코멘트
```markdown
**제안**: 이 부분에서 `map`을 사용하면 더 간결해질 것 같습니다.

**질문**: 이 타임아웃 값(30초)은 어떤 기준으로 설정하셨나요?

**문제**: `user_id`가 None일 경우 여기서 에러가 발생할 수 있습니다.
제안: `if user_id:`로 먼저 체크해주세요.

**칭찬**: 에러 처리가 깔끔하게 되어있네요!
```

### 피해야 할 코멘트
```markdown
# Bad
"이건 틀렸습니다."
"왜 이렇게 했나요?"
"이상하네요."

# Good
"이 방식도 동작하지만, X 방식이 Y 이유로 더 나을 것 같습니다."
"이 부분의 의도가 궁금합니다. 제가 이해한 바로는..."
```

## 리뷰 우선순위

| 우선순위 | 유형 | 설명 |
|---------|------|------|
| P0 | 버그 | 즉시 수정 필요 |
| P1 | 보안 | 취약점, 데이터 노출 |
| P2 | 성능 | 심각한 성능 문제 |
| P3 | 설계 | 아키텍처, 확장성 |
| P4 | 스타일 | 네이밍, 포맷팅 |

## PR 크기 가이드라인

| 변경 라인 | 권장 |
|----------|------|
| < 200 | 이상적 |
| 200-400 | 적정 |
| 400-800 | 분리 고려 |
| > 800 | 분리 필요 |

## 자동화 도구

```bash
# 린터
npm run lint          # ESLint
ruff check .          # Python

# 포맷터
npm run format        # Prettier
ruff format .         # Python

# 타입 체크
npx tsc --noEmit      # TypeScript
mypy src/             # Python

# 테스트
npm test
pytest
```

## 사용 도구

- `read`: 변경된 코드 확인
- `grep`: 패턴 검색 (중복 코드, 안티패턴)
- `bash`: `git diff`, 린터/테스트 실행

## 예시

**리뷰 요청**: "사용자 인증 API 추가"

**확인 포인트**:
1. 비밀번호 해싱 (bcrypt, argon2)
2. JWT 토큰 만료 시간
3. Rate limiting
4. 입력값 검증
5. 에러 메시지에 민감 정보 없는지
