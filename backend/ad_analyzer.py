"""
의료 광고 위반 분석 모듈
"""

from typing import Dict, List, Optional
import os
import re
import json
import asyncio
from openai import OpenAI, AsyncOpenAI
from medical_keywords import keyword_db
from dotenv import load_dotenv

load_dotenv()


# ============================================
# 위험점수 → 위험도 → 판정 자동 계산 함수
# ============================================


def calculate_risk_level(risk_score: int) -> str:
    """
    위험점수 기반 위험도 자동 결정

    | 위험점수 | 위험도   |
    |----------|----------|
    | -1       | N/A      | (의료광고 아님)
    | 0-10     | SAFE     |
    | 11-30    | LOW      |
    | 31-60    | MEDIUM   |
    | 61-80    | HIGH     |
    | 81-100   | CRITICAL |
    """
    if risk_score < 0:
        return "N/A"
    elif risk_score >= 81:
        return "CRITICAL"
    elif risk_score >= 61:
        return "HIGH"
    elif risk_score >= 31:
        return "MEDIUM"
    elif risk_score >= 11:
        return "LOW"
    else:
        return "SAFE"


def calculate_judgment(risk_level: str) -> str:
    """
    위험도 기반 판정 자동 결정

    | 위험도   | 판정     |
    |----------|----------|
    | N/A      | 불필요   | (의료광고 아님)
    | SAFE     | 통과     |
    | LOW      | 주의     |
    | MEDIUM   | 수정제안 |
    | HIGH     | 수정권고 |
    | CRITICAL | 게재불가 |
    """
    mapping = {
        "N/A": "불필요",
        "SAFE": "통과",
        "LOW": "주의",
        "MEDIUM": "수정제안",
        "HIGH": "수정권고",
        "CRITICAL": "게재불가",
    }
    return mapping.get(risk_level, "주의")


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
async_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class ViolationResult:
    """위반 분석 결과"""

    def __init__(self):
        # 기존 필드
        self.violations: List[Dict] = []  # 키워드 위반
        self.risk_score: int = 0  # 위험점수 (0-100)
        self.risk_level: str = "SAFE"  # 위험도 (위험점수 기반 자동 계산)
        self.summary: str = ""
        self.ai_analysis: Optional[str] = None  # 1차 AI 분석 텍스트 (상세용)

        # 새로 추가
        self.ai_violations: List[Dict] = []  # AI가 발견한 위반 목록
        self.judgment: str = "통과"  # 판정 (위험도 기반 자동 계산)
        self.keyword_risk_score: int = 0  # 키워드만의 위험점수 (참고용)

    # 하위 호환성을 위한 total_score 프로퍼티
    @property
    def total_score(self) -> int:
        return self.risk_score

    @total_score.setter
    def total_score(self, value: int):
        self.risk_score = value

    def to_dict(self) -> Dict:
        return {
            "violations": self.violations,
            "risk_score": self.risk_score,
            "total_score": self.risk_score,  # 하위 호환성
            "risk_level": self.risk_level,
            "judgment": self.judgment,
            "summary": self.summary,
            "ai_analysis": self.ai_analysis,
            "ai_violations": self.ai_violations,
            "keyword_risk_score": self.keyword_risk_score,
            "violation_count": len(self.violations) + len(self.ai_violations),
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
                "context": _extract_context(text, keyword),
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

    category_summary = ", ".join(
        [f"{cat} {count}건" for cat, count in categories.items()]
    )

    summary = f"총 {violation_count}개의 위반 키워드 발견 ({category_summary}). "
    summary += f"위험도: {result.risk_level}, 총점: {result.total_score}점"

    return summary


def analyze_with_ai(
    text: str, keyword_result: Optional[ViolationResult] = None, use_rag: bool = True
) -> str:
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
        violations_text = "\n".join(
            [
                f"- {v['keyword']} ({v['category']}, {v['severity']})"
                for v in keyword_result.violations[:10]  # 상위 10개만
            ]
        )
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
            max_output_tokens=1500,  # reasoning 토큰 + 실제 응답 토큰
        )

        return response.output_text or ""

    except Exception as e:
        return f"AI 분석 중 오류 발생: {str(e)}"


def analyze_complete(
    text: str, use_ai: bool = True, use_rag: bool = True
) -> ViolationResult:
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


async def _get_rag_context_async(text: str) -> str:
    """비동기 RAG 컨텍스트 검색"""
    # RAG는 CPU-bound이므로 executor에서 실행
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _get_rag_context, text)


async def analyze_with_ai_async(
    text: str,
    keyword_result: Optional[ViolationResult] = None,
    use_rag: bool = True,
    rag_context: str = "",
) -> str:
    """
    비동기 OpenAI 분석 (AsyncOpenAI 사용)

    Args:
        text: 분석할 텍스트
        keyword_result: 키워드 분석 결과
        use_rag: RAG 사용 여부
        rag_context: 미리 검색된 RAG 컨텍스트 (병렬 처리 시)

    Returns:
        str: AI 분석 결과
    """
    # 키워드 분석 결과를 컨텍스트로 포함
    keyword_context = ""
    if keyword_result and keyword_result.violations:
        violations_text = "\n".join(
            [
                f"- {v['keyword']} ({v['category']}, {v['severity']})"
                for v in keyword_result.violations[:10]
            ]
        )
        keyword_context = f"\n\n## 키워드 분석 결과\n다음 위반 키워드가 발견되었습니다:\n{violations_text}"

    # RAG 컨텍스트 (미리 제공되지 않은 경우 검색)
    if use_rag and not rag_context:
        rag_context = await _get_rag_context_async(text)

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
        response = await async_client.responses.create(
            model="gpt-5.2",
            instructions="당신은 대한민국 의료법 전문가입니다. 제공된 법규 조항을 정확히 인용하여 분석하세요.",
            input=[{"role": "user", "content": prompt}],
            max_output_tokens=1500,
        )

        return response.output_text or ""

    except Exception as e:
        return f"AI 분석 중 오류 발생: {str(e)}"


# ============================================
# 2차 LLM 판정 추출 (위험점수 기반)
# ============================================


def parse_judgment_json(response_text: str) -> Optional[Dict]:
    """
    LLM 응답에서 JSON 블록 추출 및 파싱

    Args:
        response_text: LLM 응답 텍스트

    Returns:
        파싱된 딕셔너리 또는 None
    """
    # ```json ... ``` 블록 추출
    pattern = r"```json\s*(.*?)\s*```"
    match = re.search(pattern, response_text, re.DOTALL)

    if not match:
        # JSON 블록이 없으면 전체 텍스트에서 JSON 찾기 시도
        pattern = r'\{[^{}]*"risk_score"[^{}]*\}'
        match = re.search(pattern, response_text, re.DOTALL)
        if match:
            json_str = match.group(0)
        else:
            return None
    else:
        json_str = match.group(1)

    try:
        data = json.loads(json_str)
        # 필수 필드 검증
        if "risk_score" in data:
            return data
    except json.JSONDecodeError:
        pass

    return None


async def extract_final_judgment(
    ai_analysis_text: str, keyword_violations: List[Dict], keyword_risk_score: int
) -> Optional[Dict]:
    """
    1차 AI 분석 결과에서 최종 판정 추출 (2차 LLM 호출)

    Args:
        ai_analysis_text: 1차 AI 분석 결과 (자유 형식)
        keyword_violations: 키워드 분석에서 발견된 위반 목록
        keyword_risk_score: 키워드 분석 위험점수

    Returns:
        {
            "risk_score": 0-100,
            "violations": [...],
            "summary": "한 줄 요약"
        }
    """
    prompt = f"""다음은 의료광고에 대한 AI 분석 결과입니다. 이 분석을 바탕으로 위험점수와 위반사항을 JSON 형식으로 추출하세요.

## AI 분석 결과
{ai_analysis_text}

## 키워드 분석 결과
- 발견된 위반 키워드: {len(keyword_violations)}건
- 키워드 위험점수: {keyword_risk_score}점

## 요청사항
1. 먼저 이 광고가 **의료광고인지** 판단하세요.
   - 의료기관, 의료행위, 의료기기, 의약품 등 의료 관련 내용이 포함되어야 의료광고입니다.
   - 의료 관련 문구가 없으면 의료광고가 아닙니다.

2. 의료광고인 경우 **위험점수(0-100점)**를 산정하세요.
3. 의료광고가 아닌 경우 **위험점수를 -1**로 설정하세요.

반드시 다음 JSON 형식으로만 응답하세요:

```json
{{
  "is_medical_ad": true|false,
  "risk_score": -1 또는 0-100,
  "violations": [
    {{"type": "위반유형", "description": "설명", "severity": "HIGH|MEDIUM|LOW"}}
  ],
  "summary": "한 줄 요약"
}}
```

위험점수 산정 기준:
- -1점: 의료광고 아님 (불필요)
- 0-10점: 위반 없음, 안전 (통과)
- 11-30점: 경미한 위반, 주의 필요 (주의)
- 31-60점: 중간 수준 위반, 수정 필요 (수정제안)
- 61-80점: 심각한 위반, 반드시 수정 (수정권고)
- 81-100점: 매우 심각한 위반, 게재 불가 (게재불가)

※ 위험도와 판정은 위험점수 기반으로 시스템이 자동 계산합니다.
"""

    try:
        response = await async_client.responses.create(
            model="gpt-4.1-mini",  # 간단한 추출 작업이므로 빠른 모델 사용
            instructions="JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력합니다.",
            input=[{"role": "user", "content": prompt}],
            max_output_tokens=500,
        )

        response_text = response.output_text or ""
        return parse_judgment_json(response_text)

    except Exception as e:
        print(f"[2차 LLM] 판정 추출 실패: {e}")
        return None


async def analyze_complete_async(
    text: str, use_ai: bool = True, use_rag: bool = True
) -> ViolationResult:
    """
    비동기 완전한 광고 분석 (3단계: 키워드 → 1차 AI → 2차 LLM 판정)

    Args:
        text: 분석할 텍스트
        use_ai: AI 분석 사용 여부
        use_rag: RAG 사용 여부

    Returns:
        ViolationResult: 종합 분석 결과
    """
    # ============================================
    # 1단계: 키워드 분석 (CPU-bound, 빠름)
    # ============================================
    result = analyze_keywords(text)
    result.keyword_risk_score = result.risk_score  # 키워드 점수 백업

    # ============================================
    # 2단계: 1차 AI 심층분석 (자유 형식)
    # ============================================
    if use_ai and os.getenv("OPENAI_API_KEY"):
        try:
            if use_rag:
                # RAG 검색
                rag_context = await _get_rag_context_async(text)
                # RAG 컨텍스트를 미리 제공하여 AI 분석
                ai_analysis_text = await analyze_with_ai_async(
                    text, result, use_rag=True, rag_context=rag_context
                )
            else:
                ai_analysis_text = await analyze_with_ai_async(
                    text, result, use_rag=False
                )

            result.ai_analysis = ai_analysis_text  # 상세 표시용 유지

            # ============================================
            # 3단계: 2차 LLM 위험점수 추출 (JSON)
            # ============================================
            final_judgment = await extract_final_judgment(
                ai_analysis_text, result.violations, result.keyword_risk_score
            )

            # 최종 결과 통합
            if final_judgment:
                # 위험점수 설정 (2차 LLM 결과)
                result.risk_score = int(
                    final_judgment.get("risk_score", result.keyword_risk_score)
                )

                # 위험도 자동 계산 (위험점수 기반)
                result.risk_level = calculate_risk_level(result.risk_score)

                # 판정 자동 계산 (위험도 기반)
                result.judgment = calculate_judgment(result.risk_level)

                # AI 위반 사항
                result.ai_violations = final_judgment.get("violations", [])

                # 요약 업데이트
                if final_judgment.get("summary"):
                    result.summary = final_judgment["summary"]
            else:
                # 2차 LLM 실패 시 키워드 결과 유지
                print("[분석] 2차 LLM 판정 추출 실패, 키워드 분석 결과 사용")

        except Exception as e:
            result.ai_analysis = f"AI 분석 실패: {str(e)}"
            print(f"[분석] AI 분석 오류: {e}")

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
        print(
            f"  - {v['keyword']}: {v['category']} ({v['severity']}) - {v['description']}"
        )
