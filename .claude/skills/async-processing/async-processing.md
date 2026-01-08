---
name: async-processing
description: Python/JavaScript 비동기 처리 및 동시성 패턴 가이드
---

# 비동기 처리 Skill

당신은 비동기 프로그래밍 및 동시성 처리 전문가입니다.

## 작업 순서

1. **작업 특성 분석**: I/O-bound vs CPU-bound 구분
2. **패턴 선택**: async/await, 스레드, 프로세스 결정
3. **동시성 제어**: 리소스 제한, 레이스 컨디션 방지
4. **에러 처리**: 비동기 예외 처리

## 체크리스트

- [ ] I/O-bound 작업에 async/await 사용
- [ ] CPU-bound 작업에 ProcessPoolExecutor 사용
- [ ] 동시 처리 수 제한 (Semaphore)
- [ ] 타임아웃 설정
- [ ] 적절한 에러 처리 및 리트라이
- [ ] 리소스 정리 (finally, context manager)

## Python asyncio 패턴

### 기본 async/await
```python
import asyncio

async def fetch_data(url: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

async def main():
    data = await fetch_data("https://api.example.com/data")
    print(data)

asyncio.run(main())
```

### 병렬 실행 (gather)
```python
async def fetch_all(urls: list[str]) -> list[dict]:
    tasks = [fetch_data(url) for url in urls]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return results

# 결과 처리
results = await fetch_all(urls)
for result in results:
    if isinstance(result, Exception):
        print(f"Error: {result}")
    else:
        print(result)
```

### 동시성 제한 (Semaphore)
```python
async def fetch_with_limit(urls: list[str], max_concurrent: int = 5):
    semaphore = asyncio.Semaphore(max_concurrent)

    async def limited_fetch(url: str):
        async with semaphore:
            return await fetch_data(url)

    tasks = [limited_fetch(url) for url in urls]
    return await asyncio.gather(*tasks)
```

### 타임아웃
```python
async def fetch_with_timeout(url: str, timeout: float = 10.0):
    try:
        return await asyncio.wait_for(
            fetch_data(url),
            timeout=timeout
        )
    except asyncio.TimeoutError:
        raise TimeoutError(f"Request to {url} timed out")
```

### 백그라운드 작업 (FastAPI)
```python
from fastapi import BackgroundTasks

@app.post("/process")
async def process_data(
    data: dict,
    background_tasks: BackgroundTasks
):
    # 즉시 응답 반환
    task_id = generate_task_id()

    # 백그라운드에서 처리
    background_tasks.add_task(
        process_heavy_task,
        task_id,
        data
    )

    return {"task_id": task_id, "status": "processing"}
```

### CPU-bound 작업 처리
```python
from concurrent.futures import ProcessPoolExecutor
import asyncio

def cpu_heavy_task(data):
    """CPU 집약적 작업 (동기 함수)"""
    # 복잡한 계산...
    return result

async def process_cpu_bound(data):
    """비동기 래퍼"""
    loop = asyncio.get_event_loop()
    with ProcessPoolExecutor() as executor:
        result = await loop.run_in_executor(
            executor,
            cpu_heavy_task,
            data
        )
    return result
```

## JavaScript/TypeScript 패턴

### Promise.all
```typescript
async function fetchAll(urls: string[]): Promise<any[]> {
  const promises = urls.map(url => fetch(url).then(r => r.json()));
  return Promise.all(promises);
}
```

### Promise.allSettled
```typescript
async function fetchAllSafe(urls: string[]) {
  const results = await Promise.allSettled(
    urls.map(url => fetch(url).then(r => r.json()))
  );

  return results.map(result => {
    if (result.status === 'fulfilled') {
      return { success: true, data: result.value };
    } else {
      return { success: false, error: result.reason };
    }
  });
}
```

### 동시성 제한 (p-limit)
```typescript
import pLimit from 'p-limit';

const limit = pLimit(5);  // 동시에 5개만

async function fetchWithLimit(urls: string[]) {
  const promises = urls.map(url =>
    limit(() => fetch(url).then(r => r.json()))
  );
  return Promise.all(promises);
}
```

### 리트라이 패턴
```typescript
async function fetchWithRetry(
  url: string,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url).then(r => r.json());
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
}
```

## 진행 상태 추적

```python
# 상태 저장소
task_status: dict[str, TaskStatus] = {}

@dataclass
class TaskStatus:
    task_id: str
    status: str  # pending, processing, completed, failed
    progress: float  # 0.0 ~ 1.0
    result: Any = None
    error: str | None = None

async def process_with_progress(task_id: str, items: list):
    task_status[task_id] = TaskStatus(task_id, "processing", 0.0)

    for i, item in enumerate(items):
        await process_item(item)
        task_status[task_id].progress = (i + 1) / len(items)

    task_status[task_id].status = "completed"
    task_status[task_id].progress = 1.0
```

## 큐 기반 처리 (대규모)

```python
import asyncio
from asyncio import Queue

async def producer(queue: Queue, items: list):
    for item in items:
        await queue.put(item)
    # 종료 신호
    for _ in range(WORKER_COUNT):
        await queue.put(None)

async def worker(queue: Queue, worker_id: int):
    while True:
        item = await queue.get()
        if item is None:
            break
        await process_item(item)
        queue.task_done()

async def process_with_workers(items: list, worker_count: int = 5):
    queue = Queue()
    workers = [
        asyncio.create_task(worker(queue, i))
        for i in range(worker_count)
    ]
    await producer(queue, items)
    await asyncio.gather(*workers)
```

## 사용 도구

- `read`: 비동기 코드 패턴 확인
- `grep`: `async def`, `await`, `asyncio` 검색
- `edit`: 비동기 코드 수정

## 예시

**요청**: "API 호출을 병렬로 처리하되 동시에 10개로 제한"

**구현**:
```python
semaphore = asyncio.Semaphore(10)

async def fetch_limited(url):
    async with semaphore:
        return await fetch(url)

results = await asyncio.gather(*[fetch_limited(url) for url in urls])
```
