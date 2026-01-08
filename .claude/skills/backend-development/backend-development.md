---
name: backend-development
description: Python/Node.js 백엔드 개발 가이드 (FastAPI, Flask, Express, NestJS)
---

# Backend 개발 Skill

당신은 백엔드 애플리케이션 개발 전문가입니다.

## 작업 순서

1. **아키텍처 설계**: 프로젝트 구조, 레이어 분리
2. **모델 정의**: 데이터 모델, ORM 설정
3. **비즈니스 로직**: 서비스 레이어 구현
4. **API 엔드포인트**: 라우팅 및 컨트롤러
5. **미들웨어**: 인증, 로깅, 에러 처리

## 체크리스트

- [ ] 레이어 분리 (Controller/Service/Repository)
- [ ] 환경변수 관리 (.env, config)
- [ ] 에러 처리 미들웨어
- [ ] 로깅 설정
- [ ] 입력 검증 (Pydantic, Joi, class-validator)
- [ ] 데이터베이스 연결 및 마이그레이션
- [ ] 의존성 주입 패턴

## 프로젝트 구조

### Python (FastAPI/Flask)
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # 앱 진입점
│   ├── config.py            # 설정
│   ├── dependencies.py      # 의존성 주입
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/          # 라우터
│   │   │   ├── users.py
│   │   │   └── posts.py
│   │   └── deps.py          # API 의존성
│   ├── models/              # DB 모델
│   │   ├── user.py
│   │   └── post.py
│   ├── schemas/             # Pydantic 스키마
│   │   ├── user.py
│   │   └── post.py
│   ├── services/            # 비즈니스 로직
│   │   ├── user_service.py
│   │   └── post_service.py
│   ├── repositories/        # DB 접근
│   │   └── user_repository.py
│   └── utils/               # 유틸리티
├── tests/
├── alembic/                 # 마이그레이션
├── requirements.txt
└── .env
```

### Node.js (Express/NestJS)
```
backend/
├── src/
│   ├── index.ts             # 진입점
│   ├── app.ts               # Express 앱
│   ├── config/
│   │   └── index.ts
│   ├── controllers/
│   │   └── user.controller.ts
│   ├── services/
│   │   └── user.service.ts
│   ├── repositories/
│   │   └── user.repository.ts
│   ├── models/
│   │   └── user.model.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   └── error.middleware.ts
│   ├── routes/
│   │   └── user.routes.ts
│   └── utils/
├── tests/
├── package.json
└── .env
```

## FastAPI 패턴

### 앱 설정
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작 시
    await init_db()
    yield
    # 종료 시
    await close_db()

app = FastAPI(
    title="My API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 라우터 분리
```python
# app/api/routes/users.py
from fastapi import APIRouter, Depends, HTTPException
from app.schemas.user import UserCreate, UserResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=list[UserResponse])
async def get_users(
    service: UserService = Depends()
):
    return await service.get_all()

@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    user: UserCreate,
    service: UserService = Depends()
):
    return await service.create(user)

# main.py에서 등록
app.include_router(users.router, prefix="/api")
```

### 서비스 레이어
```python
# app/services/user_service.py
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserResponse

class UserService:
    def __init__(self, repository: UserRepository = Depends()):
        self.repository = repository

    async def get_all(self) -> list[UserResponse]:
        users = await self.repository.find_all()
        return [UserResponse.model_validate(u) for u in users]

    async def create(self, data: UserCreate) -> UserResponse:
        # 비즈니스 로직
        if await self.repository.exists_by_email(data.email):
            raise HTTPException(400, "Email already exists")

        user = await self.repository.create(data)
        return UserResponse.model_validate(user)
```

### 리포지토리 패턴
```python
# app/repositories/user_repository.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User

class UserRepository:
    def __init__(self, session: AsyncSession = Depends(get_session)):
        self.session = session

    async def find_all(self) -> list[User]:
        result = await self.session.execute(select(User))
        return result.scalars().all()

    async def find_by_id(self, id: int) -> User | None:
        return await self.session.get(User, id)

    async def create(self, data: UserCreate) -> User:
        user = User(**data.model_dump())
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user
```

## Express 패턴

### 앱 설정
```typescript
// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorMiddleware } from './middlewares/error.middleware';
import { userRoutes } from './routes/user.routes';

const app = express();

// 미들웨어
app.use(helmet());
app.use(cors());
app.use(express.json());

// 라우트
app.use('/api/users', userRoutes);

// 에러 핸들러 (마지막에 등록)
app.use(errorMiddleware);

export default app;
```

### 컨트롤러
```typescript
// src/controllers/user.controller.ts
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';

export class UserController {
  constructor(private userService: UserService) {}

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await this.userService.getAll();
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.userService.create(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  };
}
```

### 에러 미들웨어
```typescript
// src/middlewares/error.middleware.ts
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string
  ) {
    super(message);
  }
}

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  console.error(err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
  });
};
```

## 설정 관리

### Python
```python
# app/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    app_name: str = "My App"
    debug: bool = False
    database_url: str
    secret_key: str
    api_key: str | None = None

    class Config:
        env_file = ".env"

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

### Node.js
```typescript
// src/config/index.ts
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'mydb',
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
};
```

## 로깅

### Python (loguru)
```python
from loguru import logger
import sys

logger.remove()
logger.add(
    sys.stdout,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}",
    level="INFO",
)
logger.add(
    "logs/app.log",
    rotation="1 day",
    retention="7 days",
)

# 사용
logger.info("User created", user_id=user.id)
logger.error("Failed to process", error=str(e))
```

### Node.js (winston)
```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});
```

## 데이터베이스 연결

### SQLAlchemy (비동기)
```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

engine = create_async_engine(
    "postgresql+asyncpg://user:pass@localhost/db",
    echo=True,
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

async def get_session():
    async with AsyncSessionLocal() as session:
        yield session
```

### Prisma (Node.js)
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 사용
const users = await prisma.user.findMany();
const user = await prisma.user.create({
  data: { email, name },
});
```

## 사용 도구

- `read`: 기존 백엔드 코드 확인
- `grep`: 패턴 검색 (라우터, 서비스 등)
- `bash`: 서버 실행, 마이그레이션

## 예시

**요청**: "사용자 CRUD 백엔드 구현"

**구현 단계**:
1. `models/user.py` - SQLAlchemy 모델
2. `schemas/user.py` - Pydantic 스키마
3. `repositories/user_repository.py` - DB 접근
4. `services/user_service.py` - 비즈니스 로직
5. `api/routes/users.py` - API 엔드포인트
6. `main.py`에 라우터 등록
