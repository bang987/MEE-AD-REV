"""
의료법 검색 및 RAG 분석 모듈
광고 텍스트에서 관련 법규를 검색하고 분석에 활용
"""

from typing import List, Dict, Optional
from .vector_store import get_vector_store, initialize_vector_store


class MedicalLawRetriever:
    """의료법 검색 및 컨텍스트 생성"""

    def __init__(self):
        self.vector_store = get_vector_store()

    def retrieve_relevant_laws(self, ad_text: str, top_k: int = 5) -> List[Dict]:
        """
        광고 텍스트와 관련된 법규 조항 검색

        Args:
            ad_text: 광고 텍스트
            top_k: 검색할 조항 수

        Returns:
            관련 법규 조항 리스트
        """
        results = self.vector_store.search_with_score(ad_text, top_k=top_k)

        relevant_laws = []
        for doc, score in results:
            relevant_laws.append(
                {
                    "content": doc.page_content,
                    "title": doc.metadata.get("title", ""),
                    "source": doc.metadata.get("source", ""),
                    "relevance_score": 1 - score,  # 거리를 유사도로 변환
                }
            )

        return relevant_laws

    def build_rag_context(self, ad_text: str, top_k: int = 5) -> str:
        """
        RAG 컨텍스트 생성 (GPT 프롬프트에 주입할 법규 정보)

        Args:
            ad_text: 광고 텍스트
            top_k: 검색할 조항 수

        Returns:
            법규 컨텍스트 문자열
        """
        laws = self.retrieve_relevant_laws(ad_text, top_k=top_k)

        if not laws:
            return ""

        context_parts = ["## 관련 의료법 조항 (RAG 검색 결과)"]

        for i, law in enumerate(laws, 1):
            context_parts.append(f"\n### [{i}] {law['title']}")
            context_parts.append(law["content"])

        return "\n".join(context_parts)


# 싱글톤 인스턴스
_retriever_instance: Optional[MedicalLawRetriever] = None


def get_retriever() -> MedicalLawRetriever:
    """리트리버 싱글톤 인스턴스 반환"""
    global _retriever_instance
    if _retriever_instance is None:
        # 벡터 스토어 초기화 확인
        initialize_vector_store()
        _retriever_instance = MedicalLawRetriever()
    return _retriever_instance


def search_medical_laws(ad_text: str, top_k: int = 5) -> str:
    """
    광고 텍스트에 대한 관련 법규 검색 (간편 함수)

    Args:
        ad_text: 광고 텍스트
        top_k: 검색할 조항 수

    Returns:
        관련 법규 컨텍스트 문자열
    """
    retriever = get_retriever()
    return retriever.build_rag_context(ad_text, top_k=top_k)
