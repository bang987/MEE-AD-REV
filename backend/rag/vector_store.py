"""
벡터 데이터베이스 관리 모듈
Chroma PersistentClient를 사용하여 의료법 문서를 임베딩하고 저장
지원 형식: .txt, .pdf
"""

from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader

load_dotenv()


class MedicalLawVectorStore:
    """의료법 문서를 위한 벡터 저장소"""

    def __init__(
        self,
        persist_directory: str = "./chroma_db",
        collection_name: str = "medical_laws",
    ):
        self.persist_directory = persist_directory
        self.collection_name = collection_name

        # OpenAI 임베딩 모델
        self.embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

        # Chroma 벡터 스토어
        self.vectorstore = Chroma(
            collection_name=collection_name,
            embedding_function=self.embeddings,
            persist_directory=persist_directory,
        )

    def _read_pdf(self, file_path: str) -> str:
        """PDF 파일에서 텍스트 추출"""
        reader = PdfReader(file_path)
        text_parts = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                text_parts.append(text)
        return "\n\n".join(text_parts)

    def _read_txt(self, file_path: str) -> str:
        """TXT 파일 읽기"""
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()

    def load_and_index_documents(self, file_path: str) -> int:
        """
        법규 문서를 로드하고 벡터 DB에 인덱싱
        지원 형식: .txt, .pdf

        Args:
            file_path: 법규 문서 파일 경로

        Returns:
            인덱싱된 청크 수
        """
        file_path = Path(file_path)
        ext = file_path.suffix.lower()

        # 파일 형식에 따라 읽기
        if ext == ".pdf":
            content = self._read_pdf(str(file_path))
        elif ext == ".txt":
            content = self._read_txt(str(file_path))
        else:
            raise ValueError(f"지원하지 않는 파일 형식: {ext}")

        if not content.strip():
            print(f"[RAG] 경고: 빈 파일 - {file_path.name}")
            return 0

        # 텍스트 분할 (섹션 단위로)
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50,
            separators=["\n## ", "\n### ", "\n- ", "\n", " "],
        )

        chunks = text_splitter.split_text(content)

        # Document 객체로 변환
        documents = []
        for i, chunk in enumerate(chunks):
            # 메타데이터 추출 (제목 추정)
            lines = chunk.strip().split("\n")
            title = lines[0] if lines else f"chunk_{i}"

            doc = Document(
                page_content=chunk,
                metadata={
                    "source": str(file_path),
                    "file_type": ext,
                    "chunk_id": i,
                    "title": title[:100],  # 제목 100자 제한
                },
            )
            documents.append(doc)

        # 벡터 스토어에 추가
        self.vectorstore.add_documents(documents)

        return len(documents)

    def search(self, query: str, top_k: int = 3) -> List[Document]:
        """
        쿼리와 유사한 법규 조항 검색

        Args:
            query: 검색 쿼리 (광고 텍스트)
            top_k: 반환할 결과 수

        Returns:
            관련 법규 문서 리스트
        """
        results = self.vectorstore.similarity_search(query=query, k=top_k)
        return results

    def search_with_score(self, query: str, top_k: int = 3) -> List[tuple]:
        """
        유사도 점수와 함께 검색

        Args:
            query: 검색 쿼리
            top_k: 반환할 결과 수

        Returns:
            (Document, score) 튜플 리스트
        """
        results = self.vectorstore.similarity_search_with_score(query=query, k=top_k)
        return results

    def get_collection_count(self) -> int:
        """벡터 DB에 저장된 문서 수 반환"""
        return self.vectorstore._collection.count()

    def clear(self):
        """벡터 DB 초기화"""
        self.vectorstore.delete_collection()
        self.vectorstore = Chroma(
            collection_name=self.collection_name,
            embedding_function=self.embeddings,
            persist_directory=self.persist_directory,
        )

    def remove_documents_by_source(self, source_path: str) -> int:
        """
        특정 소스 파일의 문서들을 벡터 DB에서 제거

        Args:
            source_path: 제거할 문서의 소스 경로

        Returns:
            제거된 문서 수
        """
        try:
            # Chroma 컬렉션에서 해당 소스의 문서 ID 조회
            collection = self.vectorstore._collection
            results = collection.get(where={"source": source_path})

            if results and results["ids"]:
                count = len(results["ids"])
                collection.delete(ids=results["ids"])
                print(f"[RAG] 문서 제거: {source_path} ({count} chunks)")
                return count
            return 0
        except Exception as e:
            print(f"[RAG] 문서 제거 실패: {e}")
            return 0


# 싱글톤 인스턴스
_vector_store_instance: Optional[MedicalLawVectorStore] = None


def get_vector_store() -> MedicalLawVectorStore:
    """벡터 스토어 싱글톤 인스턴스 반환"""
    global _vector_store_instance
    if _vector_store_instance is None:
        _vector_store_instance = MedicalLawVectorStore()
    return _vector_store_instance


def index_single_file(file_path: str) -> int:
    """
    단일 파일을 벡터 DB에 인덱싱

    Args:
        file_path: 인덱싱할 파일 경로

    Returns:
        인덱싱된 청크 수
    """
    store = get_vector_store()
    try:
        chunks = store.load_and_index_documents(file_path)
        print(f"[RAG] 단일 파일 인덱싱: {Path(file_path).name} ({chunks} chunks)")
        return chunks
    except Exception as e:
        print(f"[RAG] 단일 파일 인덱싱 실패: {e}")
        return 0


def remove_file_from_index(file_path: str) -> int:
    """
    벡터 DB에서 특정 파일의 인덱스 제거

    Args:
        file_path: 제거할 파일 경로

    Returns:
        제거된 청크 수
    """
    store = get_vector_store()
    return store.remove_documents_by_source(file_path)


def initialize_vector_store(data_dir: str = None, force_reindex: bool = False) -> int:
    """
    벡터 스토어 초기화 및 문서 인덱싱
    data/ 폴더의 모든 .txt, .pdf 파일을 자동 인덱싱

    Args:
        data_dir: 법규 문서 디렉토리 경로
        force_reindex: True면 기존 인덱스 삭제 후 재인덱싱

    Returns:
        인덱싱된 총 청크 수
    """
    if data_dir is None:
        data_dir = Path(__file__).parent.parent / "data"
    else:
        data_dir = Path(data_dir)

    store = get_vector_store()

    # 강제 재인덱싱
    if force_reindex:
        print("[RAG] 기존 인덱스 삭제 중...")
        store.clear()

    # 이미 인덱싱되어 있으면 스킵
    if store.get_collection_count() > 0:
        print(f"[RAG] 기존 인덱스 사용 ({store.get_collection_count()} chunks)")
        return store.get_collection_count()

    total_chunks = 0

    # 지원 파일 형식
    supported_extensions = [".txt", ".pdf"]

    # data/ 폴더의 모든 지원 파일 인덱싱
    for ext in supported_extensions:
        for file_path in data_dir.glob(f"*{ext}"):
            try:
                chunks = store.load_and_index_documents(str(file_path))
                total_chunks += chunks
                print(f"[RAG] 인덱싱 완료: {file_path.name} ({chunks} chunks)")
            except Exception as e:
                print(f"[RAG] 인덱싱 실패: {file_path.name} - {e}")

    if total_chunks == 0:
        print(f"[RAG] 경고: {data_dir}에서 문서를 찾지 못했습니다.")

    return total_chunks
