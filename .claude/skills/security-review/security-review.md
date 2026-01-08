---
name: security-review
description: 웹 애플리케이션 보안 검토 가이드 (OWASP 기반)
---

# 보안 검토 Skill

당신은 웹 애플리케이션 보안 전문가입니다.

## 작업 순서

1. **입력 검증**: 모든 사용자 입력 검증
2. **인증/인가**: 접근 제어 확인
3. **데이터 보호**: 민감 정보 처리
4. **취약점 점검**: OWASP Top 10 체크

## OWASP Top 10 체크리스트

- [ ] A01: 접근 제어 취약점 (Broken Access Control)
- [ ] A02: 암호화 실패 (Cryptographic Failures)
- [ ] A03: 인젝션 (Injection)
- [ ] A04: 안전하지 않은 설계 (Insecure Design)
- [ ] A05: 보안 설정 오류 (Security Misconfiguration)
- [ ] A06: 취약한 구성요소 (Vulnerable Components)
- [ ] A07: 인증 실패 (Authentication Failures)
- [ ] A08: 데이터 무결성 실패 (Data Integrity Failures)
- [ ] A09: 로깅/모니터링 실패 (Logging Failures)
- [ ] A10: SSRF (Server-Side Request Forgery)

## 입력 검증

### 경로 Traversal 방지
```python
# 위험
file_path = f"/uploads/{user_input}"  # ../../../etc/passwd

# 안전
from pathlib import Path
safe_name = Path(user_input).name  # 파일명만 추출
file_path = UPLOAD_DIR / safe_name
```

### SQL Injection 방지
```python
# 위험
query = f"SELECT * FROM users WHERE id = {user_id}"

# 안전 (파라미터 바인딩)
query = "SELECT * FROM users WHERE id = ?"
cursor.execute(query, (user_id,))

# ORM 사용
user = session.query(User).filter(User.id == user_id).first()
```

### XSS 방지
```typescript
// 위험
element.innerHTML = userInput;

// 안전
element.textContent = userInput;

// React는 기본적으로 이스케이프
<div>{userInput}</div>  // 안전

// 위험 (dangerouslySetInnerHTML)
<div dangerouslySetInnerHTML={{ __html: userInput }} />  // 피하기
```

### Command Injection 방지
```python
# 위험
os.system(f"convert {user_filename} output.png")

# 안전
import subprocess
subprocess.run(["convert", user_filename, "output.png"], check=True)
```

## 파일 업로드 보안

```python
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.pdf'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def validate_upload(file: UploadFile) -> bool:
    # 1. 확장자 검증
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, "허용되지 않는 파일 형식")

    # 2. 파일명 정규화
    safe_filename = secure_filename(file.filename)

    # 3. MIME 타입 검증
    content_type = magic.from_buffer(file.file.read(1024), mime=True)
    file.file.seek(0)
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(400, "파일 타입 불일치")

    # 4. 크기 검증
    file.file.seek(0, 2)  # EOF로 이동
    size = file.file.tell()
    file.file.seek(0)
    if size > MAX_FILE_SIZE:
        raise HTTPException(400, "파일 크기 초과")

    return True
```

## 인증/인가

### JWT 토큰 처리
```python
from jose import jwt, JWTError

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=["HS256"]
        )
        return payload
    except JWTError:
        raise HTTPException(401, "유효하지 않은 토큰")
```

### 권한 검사
```python
def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(403, "관리자 권한 필요")
    return current_user
```

## 환경변수 관리

```python
# .env (gitignore에 포함)
DATABASE_URL=postgresql://...
SECRET_KEY=your-secret-key
API_KEY=...

# 코드에서 사용
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY가 설정되지 않았습니다")
```

## CORS 설정

```python
# 개발 환경
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발용
    allow_methods=["*"],
    allow_headers=["*"],
)

# 프로덕션 환경
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://myapp.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

## 민감 정보 처리

```python
# 로깅에서 제외
import logging

class SensitiveFilter(logging.Filter):
    def filter(self, record):
        # 비밀번호, API 키 등 마스킹
        record.msg = re.sub(r'password=\S+', 'password=***', str(record.msg))
        return True

# 응답에서 제외
class UserResponse(BaseModel):
    id: str
    email: str
    # password_hash 제외

    class Config:
        fields = {'password_hash': {'exclude': True}}
```

## Rate Limiting

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/login")
@limiter.limit("5/minute")
async def login(request: Request):
    ...
```

## 사용 도구

- `grep`: 보안 취약점 패턴 검색 (`eval`, `exec`, `innerHTML`)
- `read`: 인증/파일 업로드 코드 검토
- `bash`: 의존성 취약점 검사 (`npm audit`, `safety check`)

## 예시

**검토 대상**: 파일 업로드 API

**체크 포인트**:
1. 경로 traversal 방지? (`Path(filename).name`)
2. 확장자 화이트리스트?
3. 파일 크기 제한?
4. MIME 타입 검증?
5. 임시 파일 정리?
