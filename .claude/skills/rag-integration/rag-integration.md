---
name: rag-integration
description: RAG (Retrieval-Augmented Generation) 시스템 구축 가이드
---

# RAG 통합 Skill

당신은 RAG 시스템 설계 및 구현 전문가입니다.

## 작업 순서

1. **문서 수집**: 대상 문서 준비 및 전처리
2. **청킹 전략**: 문서 분할 방법 결정
3. **임베딩**: 벡터화 모델 선택 및 적용
4. **벡터 DB**: 저장소 구축 및 인덱싱
5. **검색 통합**: LLM과 검색 결과 연결

## 체크리스트

- [ ] 문서 형식 처리 (PDF, TXT, HTML, Markdown)
- [ ] 적절한 청킹 크기 (500-1500 토큰)
- [ ] 청크 오버랩 설정 (10-20%)
- [ ] 메타데이터 보존 (출처, 페이지, 섹션)
- [ ] 임베딩 모델 선택 및 설정
- [ ] 유사도 검색 최적화
- [ ] LLM 프롬프트 설계

## 기술 스택 옵션

### 벡터 데이터베이스

| DB | 특징 | 사용 사례 |
|----|------|----------|
| Chroma | 로컬, 간단, 무료 | 소규모, 프로토타입 |
| FAISS | 빠름, 무료, 메모리 | 대규모, 고성능 |
| Pinecone | 관리형, 확장성 | 프로덕션, 대규모 |
| Weaviate | 하이브리드 검색 | 복잡한 쿼리 |
| pgvector | PostgreSQL 확장 | 기존 DB 활용 |

### 임베딩 모델

| 모델 | 특징 | 비용 |
|------|------|------|
| OpenAI text-embedding-3-small | 고품질, 저렴 | 유료 |
| OpenAI text-embedding-3-large | 최고 품질 | 유료 |
| sentence-transformers | 로컬, 무료 | 무료 |
| Cohere embed | 다국어 지원 | 유료 |

## 문서 처리 파이프라인

### 1. 문서 로딩
```python
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    UnstructuredHTMLLoader,
    DirectoryLoader,
)

def load_document(file_path: str):
    ext = Path(file_path).suffix.lower()

    loaders = {
        '.pdf': PyPDFLoader,
        '.txt': TextLoader,
        '.html': UnstructuredHTMLLoader,
        '.md': TextLoader,
    }

    loader_class = loaders.get(ext)
    if not loader_class:
        raise ValueError(f"Unsupported format: {ext}")

    return loader_class(file_path).load()
```

### 2. 청킹 전략
```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

# 기본 설정
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=100,
    length_function=len,
    separators=["\n\n", "\n", ".", "!", "?", ",", " ", ""],
)

# 청킹 실행
chunks = text_splitter.split_documents(documents)
```

### 3. 메타데이터 추가
```python
def add_metadata(chunks, source_file: str):
    for i, chunk in enumerate(chunks):
        chunk.metadata.update({
            "source": source_file,
            "chunk_id": i,
            "chunk_count": len(chunks),
        })
    return chunks
```

## 벡터 스토어 구축

### Chroma
```python
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

vectorstore = Chroma(
    collection_name="my_documents",
    embedding_function=embeddings,
    persist_directory="./chroma_db",
)

# 문서 추가
vectorstore.add_documents(chunks)

# 검색
results = vectorstore.similarity_search(
    query="검색 쿼리",
    k=5,
)
```

### FAISS
```python
from langchain_community.vectorstores import FAISS

vectorstore = FAISS.from_documents(
    documents=chunks,
    embedding=embeddings,
)

# 저장
vectorstore.save_local("faiss_index")

# 로드
vectorstore = FAISS.load_local("faiss_index", embeddings)
```

## 검색 전략

### 기본 유사도 검색
```python
def search(query: str, top_k: int = 5):
    results = vectorstore.similarity_search(
        query=query,
        k=top_k,
    )
    return results
```

### 점수 포함 검색
```python
def search_with_score(query: str, top_k: int = 5):
    results = vectorstore.similarity_search_with_score(
        query=query,
        k=top_k,
    )
    # (Document, score) 튜플 리스트
    return results
```

### 필터링 검색
```python
def search_filtered(query: str, source: str):
    results = vectorstore.similarity_search(
        query=query,
        k=5,
        filter={"source": source},
    )
    return results
```

### 하이브리드 검색 (키워드 + 시맨틱)
```python
from langchain.retrievers import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever

# BM25 (키워드 기반)
bm25_retriever = BM25Retriever.from_documents(documents)
bm25_retriever.k = 5

# 벡터 검색
vector_retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

# 앙상블
ensemble_retriever = EnsembleRetriever(
    retrievers=[bm25_retriever, vector_retriever],
    weights=[0.3, 0.7],
)
```

## LLM 통합

### 프롬프트 설계
```python
def build_rag_prompt(query: str, context_docs: list) -> str:
    context = "\n\n".join([
        f"[출처: {doc.metadata.get('source', 'Unknown')}]\n{doc.page_content}"
        for doc in context_docs
    ])

    return f"""다음 문서를 참고하여 질문에 답변해주세요.

## 참고 문서
{context}

## 질문
{query}

## 답변 지침
- 문서에 있는 정보만 사용하세요
- 출처를 명시하세요
- 문서에 없는 정보는 "문서에서 찾을 수 없습니다"라고 답변하세요
"""
```

### RAG 체인
```python
from langchain_openai import ChatOpenAI
from langchain.chains import RetrievalQA

llm = ChatOpenAI(model="gpt-4")

qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",
    retriever=vectorstore.as_retriever(),
    return_source_documents=True,
)

result = qa_chain({"query": "질문"})
answer = result["result"]
sources = result["source_documents"]
```

## 평가 지표

| 지표 | 설명 | 목표 |
|------|------|------|
| Recall@K | 관련 문서 검색 비율 | > 0.8 |
| MRR | 첫 관련 문서 순위 | > 0.7 |
| 응답 정확도 | 답변 품질 | 수동 평가 |
| 지연 시간 | 검색 + 생성 시간 | < 3초 |

## 사용 도구

- `read`: 문서 처리 코드 확인
- `bash`: 벡터 DB 상태 확인
- `edit`: RAG 파이프라인 수정

## 예시

**요청**: "PDF 문서 기반 Q&A 시스템 구축"

**구현 단계**:
1. PDF 로딩 → 텍스트 추출
2. 청킹 (1000자, 100자 오버랩)
3. OpenAI 임베딩 → Chroma 저장
4. 유사도 검색 (top-5)
5. GPT-4로 답변 생성
