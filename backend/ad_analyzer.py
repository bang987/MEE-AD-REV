"""
의료 광고 위반 분석 모듈
"""
from typing import Dict, List, Optional
import os
from openai import OpenAI
from medical_keywords import keyword_db
from dotenv import load_dotenv

load_dotenv()

# RAG 모듈 임포트 (lazy loading)
_rag_initialized = False
_rag_retriever = None


def _get_rag_context(text: str) -> str:
    """RAG를 사용하여 관련 법규 컨텍스트 검색"""
    global _rag_initialized, _rag_retriever

    try:
        if not _rag_initialized:
            from rag.retriever import get_retriever
            from rag.vector_store import initialize_vector_store
            initialize_vector_store()
            _rag_retriever = get_retriever()
            _rag_initialized = True

        if _rag_retriever:
            return _rag_retriever.build_rag_context(text, top_k=5)
    except Exception as e:
        print(f"[RAG] 컨텍스트 검색 실패: {e}")

    return ""

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class ViolationResult:
    """위반 분석 결과"""
    def __init__(self):
        self.violations: List[Dict] = []
        self.total_score: int = 0
        self.risk_level: str = "LOW"
        self.summary: str = ""
        self.ai_analysis: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            "violations": self.violations,
            "total_score": self.total_score,
            "risk_level": self.risk_level,
            "summary": self.summary,
            "ai_analysis": self.ai_analysis,
            "violation_count": len(self.violations)
        }


def analyze_keywords(text: str) -> ViolationResult:
    """
    키워드 기반 광고 위반 분석

    Args:
        text: 분석할 텍스트

    Returns:
        ViolationResult: 분석 결과
    """
    result = ViolationResult()

    # 텍스트를 소문자로 변환하여 검색
    text_lower = text.lower()

    # 각 키워드 검색
    for keyword in keyword_db.get_all_keywords():
        keyword_lower = keyword.lower()

        # 키워드 출현 횟수 계산
        count = text_lower.count(keyword_lower)

        if count > 0:
            category, severity, law, description = keyword_db.get_keyword_info(keyword)
            base_score = keyword_db.get_severity_score(severity)

            # 반복 가산점: 첫 번째는 기본 점수, 이후 +5점/회
            repetition_bonus = (count - 1) * 5 if count > 1 else 0
            total_keyword_score = base_score + repetition_bonus

            # 위반 항목 추가
            violation = {
                "keyword": keyword,
                "category": category,
                "severity": severity,
                "score": base_score,
                "count": count,
                "repetition_bonus": repetition_bonus,
                "total_score": total_keyword_score,
                "law": law,
                "description": description,
                "context": _extract_context(text, keyword)
            }
            result.violations.append(violation)
            result.total_score += total_keyword_score

    # 위험도 계산
    result.risk_level = _calculate_risk_level(result.total_score)

    # 요약 생성
    result.summary = _generate_summary(result)

    return result


def _extract_context(text: str, keyword: str, window: int = 30) -> str:
    """키워드 주변 문맥 추출"""
    text_lower = text.lower()
    keyword_lower = keyword.lower()

    idx = text_lower.find(keyword_lower)
    if idx == -1:
        return ""

    start = max(0, idx - window)
    end = min(len(text), idx + len(keyword) + window)

    context = text[start:end]
    if start > 0:
        context = "..." + context
    if end < len(text):
        context = context + "..."

    return context


def _calculate_risk_level(total_score: int) -> str:
    """총점에 따른 위험도 계산"""
    if total_score >= 100:
        return "CRITICAL"
    elif total_score >= 50:
        return "HIGH"
    elif total_score >= 20:
        return "MEDIUM"
    elif total_score > 0:
        return "LOW"
    else:
        return "SAFE"


def _generate_summary(result: ViolationResult) -> str:
    """분석 결과 요약 생성"""
    if result.total_score == 0:
        return "위반 키워드가 발견되지 않았습니다."

    violation_count = len(result.violations)

    # 카테고리별 집계
    categories = {}
    for v in result.violations:
        cat = v["category"]
        categories[cat] = categories.get(cat, 0) + 1

    category_summary = ", ".join([f"{cat} {count}건" for cat, count in categories.items()])

    summary = f"총 {violation_count}개의 위반 키워드 발견 ({category_summary}). "
    summary += f"위험도: {result.risk_level}, 총점: {result.total_score}점"

    return summary


def analyze_with_ai(text: str, keyword_result: Optional[ViolationResult] = None, use_rag: bool = True) -> str:
    """
    OpenAI를 사용한 심층 광고 분석 (RAG 지원)

    Args:
        text: 분석할 텍스트
        keyword_result: 키워드 분석 결과 (선택)
        use_rag: RAG 사용 여부

    Returns:
        str: AI 분석 결과
    """

    # 키워드 분석 결과를 컨텍스트로 포함
    keyword_context = ""
    if keyword_result and keyword_result.violations:
        violations_text = "\n".join([
            f"- {v['keyword']} ({v['category']}, {v['severity']})"
            for v in keyword_result.violations[:10]  # 상위 10개만
        ])
        keyword_context = f"\n\n## 키워드 분석 결과\n다음 위반 키워드가 발견되었습니다:\n{violations_text}"

    # RAG로 관련 법규 검색
    rag_context = ""
    if use_rag:
        rag_context = _get_rag_context(text)
        if rag_context:
            rag_context = f"\n\n{rag_context}"

    prompt = f"""당신은 대한민국 의료법 전문가입니다. 다음 의료 광고 텍스트를 분석하여 의료법 위반 여부를 판단하세요.
{rag_context}
{keyword_context}

## 분석 대상 광고 텍스트
{text}

## 요청사항
위 법규 조항을 근거로 광고의 위반 여부를 판정하고, 각 판정에 대해 정확한 법규 조항을 인용해주세요.

다음 형식으로 분석 결과를 제공하세요:

**위반 사항:**
- 발견된 위반 내용을 구체적으로 나열

**법적 근거:**
- 해당하는 의료법 조항 명시 (RAG 검색 결과 활용)

**권고 사항:**
- 광고 수정 방안 제시

**전체 평가:**
- 위험도 (안전/낮음/보통/높음/매우높음)
- 종합 의견
"""

    try:
        response = client.responses.create(
            model="gpt-5.2",
            instructions="당신은 대한민국 의료법 전문가입니다. 제공된 법규 조항을 정확히 인용하여 분석하세요.",
            input=[{"role": "user", "content": prompt}],
            max_output_tokens=1500  # reasoning 토큰 + 실제 응답 토큰

        )

        return response.output_text or ""

    except Exception as e:
        return f"AI 분석 중 오류 발생: {str(e)}"


def analyze_complete(text: str, use_ai: bool = True, use_rag: bool = True) -> ViolationResult:
    """
    완전한 광고 분석 (키워드 + AI)

    Args:
        text: 분석할 텍스트
        use_ai: AI 분석 사용 여부
        use_rag: RAG (법규 검색) 사용 여부

    Returns:
        ViolationResult: 종합 분석 결과
    """
    # 1. 키워드 기반 분석
    result = analyze_keywords(text)

    # 2. AI 분석 (옵션)
    if use_ai and os.getenv("OPENAI_API_KEY"):
        try:
            result.ai_analysis = analyze_with_ai(text, result, use_rag=use_rag)
        except Exception as e:
            result.ai_analysis = f"AI 분석 실패: {str(e)}"

    return result


if __name__ == "__main__":
    # 테스트
    test_text = """
    최고의 성형외과! 100% 만족 보장!
    당일 수술 가능, 무료 상담 이벤트 진행중
    타병원보다 저렴한 가격으로 최상의 결과를 약속드립니다.
    """

    result = analyze_complete(test_text, use_ai=False)
    print("=== 광고 위반 분석 결과 ===")
    print(f"총점: {result.total_score}")
    print(f"위험도: {result.risk_level}")
    print(f"요약: {result.summary}")
    print(f"\n발견된 위반 ({len(result.violations)}건):")
    for v in result.violations:
        print(f"  - {v['keyword']}: {v['category']} ({v['severity']}) - {v['description']}")
