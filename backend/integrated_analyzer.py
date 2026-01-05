"""
통합 의료 광고 분석 엔진
OCR + 키워드 탐지 + GPT-4 분석을 통합한 전체 파이프라인
"""

import os
import json
import requests
import time
from pathlib import Path
from typing import Dict, Optional
from dotenv import load_dotenv
from ad_analyzer import analyze_complete, ViolationResult

load_dotenv()

NAVER_OCR_API_URL = os.getenv("NAVER_OCR_API_URL")
NAVER_OCR_SECRET_KEY = os.getenv("NAVER_OCR_SECRET_KEY")


class AnalysisResult:
    """전체 분석 결과"""

    def __init__(self):
        self.success: bool = False
        self.image_filename: str = ""

        # OCR 결과
        self.ocr_text: str = ""
        self.ocr_confidence: float = 0.0
        self.ocr_processing_time: float = 0.0

        # 키워드 분석 결과
        self.violations: list = []
        self.total_score: int = 0
        self.risk_level: str = "SAFE"
        self.violation_summary: str = ""

        # GPT-4 분석 결과
        self.ai_analysis: Optional[str] = None
        self.ai_processing_time: float = 0.0

        # 전체 처리 시간
        self.total_processing_time: float = 0.0

        # 판정 결과
        self.pass_fail: str = "PASS"  # PASS or FAIL
        self.recommendation: str = ""

        # 오류
        self.error: Optional[str] = None

    def to_dict(self) -> Dict:
        """딕셔너리로 변환"""
        return {
            "success": self.success,
            "image_filename": self.image_filename,
            "ocr": {
                "text": self.ocr_text,
                "confidence": self.ocr_confidence,
                "processing_time": self.ocr_processing_time
            },
            "keyword_analysis": {
                "violations": self.violations,
                "total_score": self.total_score,
                "risk_level": self.risk_level,
                "summary": self.violation_summary,
                "violation_count": len(self.violations)
            },
            "ai_analysis": {
                "result": self.ai_analysis,
                "processing_time": self.ai_processing_time
            },
            "judgment": {
                "pass_fail": self.pass_fail,
                "recommendation": self.recommendation
            },
            "processing_time": {
                "ocr": self.ocr_processing_time,
                "ai": self.ai_processing_time,
                "total": self.total_processing_time
            },
            "error": self.error
        }


class MedicalAdAnalyzer:
    """통합 의료 광고 분석기"""

    def __init__(self):
        """초기화"""
        if not NAVER_OCR_API_URL or not NAVER_OCR_SECRET_KEY:
            raise ValueError("OCR API 설정이 필요합니다. .env 파일을 확인하세요.")

    def analyze_image(self, image_path: str, use_ai: bool = True) -> AnalysisResult:
        """
        이미지 전체 분석 파이프라인

        Args:
            image_path: 분석할 이미지 파일 경로
            use_ai: GPT-4 분석 사용 여부

        Returns:
            AnalysisResult: 전체 분석 결과
        """
        result = AnalysisResult()
        result.image_filename = Path(image_path).name

        # 전체 시작 시간
        total_start = time.time()

        try:
            # 1단계: OCR 텍스트 추출
            print("📷 1단계: OCR 텍스트 추출 중...")
            ocr_start = time.time()
            ocr_result = self._perform_ocr(image_path)
            result.ocr_processing_time = time.time() - ocr_start

            if not ocr_result["success"]:
                result.error = ocr_result.get("error", "OCR 실패")
                result.total_processing_time = time.time() - total_start
                return result

            result.ocr_text = ocr_result["text"]
            result.ocr_confidence = ocr_result["confidence"]
            print(f"✅ OCR 완료 ({result.ocr_processing_time:.2f}초)")
            print(f"   추출된 텍스트: {result.ocr_text[:100]}...")

            # 2단계: 키워드 + GPT-4 분석
            print("\n🔍 2단계: 키워드 탐지 및 AI 분석 중...")
            ai_start = time.time()
            analysis_result = analyze_complete(result.ocr_text, use_ai=use_ai)
            result.ai_processing_time = time.time() - ai_start

            # 키워드 분석 결과 저장
            result.violations = analysis_result.violations
            result.total_score = analysis_result.total_score
            result.risk_level = analysis_result.risk_level
            result.violation_summary = analysis_result.summary

            # AI 분석 결과 저장
            result.ai_analysis = analysis_result.ai_analysis

            print(f"✅ 분석 완료 ({result.ai_processing_time:.2f}초)")
            print(f"   위험도: {result.risk_level}, 총점: {result.total_score}점")

            # 3단계: 최종 판정
            result.pass_fail = self._determine_pass_fail(result)
            result.recommendation = self._generate_recommendation(result)

            result.success = True

        except Exception as e:
            result.error = f"분석 중 오류 발생: {str(e)}"
            print(f"❌ 오류: {result.error}")

        finally:
            result.total_processing_time = time.time() - total_start

        return result

    def _perform_ocr(self, image_path: str) -> Dict:
        """
        Naver Clova OCR을 사용하여 이미지에서 텍스트 추출

        Args:
            image_path: 이미지 파일 경로

        Returns:
            dict: OCR 결과
        """
        try:
            # 이미지 파일 읽기
            with open(image_path, "rb") as f:
                image_data = f.read()

            # 파일 확장자 확인
            file_ext = Path(image_path).suffix.lower()
            image_format = "jpg" if file_ext in ['.jpg', '.jpeg'] else "png"

            # 요청 본문 구성
            request_json = {
                "images": [
                    {
                        "format": image_format,
                        "name": "medical_ad_image"
                    }
                ],
                "requestId": f"ocr-{int(time.time())}",
                "version": "V2",
                "timestamp": 0
            }

            # 헤더 설정
            headers = {
                "X-OCR-SECRET": NAVER_OCR_SECRET_KEY
            }

            # 파일 데이터 설정
            files = {
                "message": (None, json.dumps(request_json), "application/json"),
                "file": (Path(image_path).name, image_data, f"image/{image_format}")
            }

            # API 요청
            response = requests.post(
                NAVER_OCR_API_URL,
                headers=headers,
                files=files,
                timeout=30
            )

            if response.status_code == 200:
                api_result = response.json()

                # 추출된 텍스트 및 신뢰도 계산
                extracted_text = ""
                total_confidence = 0.0
                fields_count = 0

                if "images" in api_result and len(api_result["images"]) > 0:
                    fields = api_result["images"][0].get("fields", [])
                    fields_count = len(fields)

                    for field in fields:
                        text = field.get("inferText", "")
                        confidence = field.get("inferConfidence", 0.0)
                        extracted_text += text + " "
                        total_confidence += confidence

                    # 평균 신뢰도 계산
                    avg_confidence = (total_confidence / fields_count * 100) if fields_count > 0 else 0.0
                else:
                    avg_confidence = 0.0

                return {
                    "success": True,
                    "text": extracted_text.strip(),
                    "confidence": round(avg_confidence, 2),
                    "fields_count": fields_count
                }
            else:
                return {
                    "success": False,
                    "error": f"OCR API 오류: HTTP {response.status_code}"
                }

        except Exception as e:
            return {
                "success": False,
                "error": f"OCR 처리 중 오류: {str(e)}"
            }

    def _determine_pass_fail(self, result: AnalysisResult) -> str:
        """
        최종 합격/불합격 판정

        Args:
            result: 분석 결과

        Returns:
            str: "PASS" 또는 "FAIL"
        """
        # 위험도 기준
        if result.risk_level in ["CRITICAL", "HIGH"]:
            return "FAIL"
        elif result.risk_level == "MEDIUM":
            return "WARNING"  # 수정 필요
        else:
            return "PASS"

    def _generate_recommendation(self, result: AnalysisResult) -> str:
        """
        권고 사항 생성

        Args:
            result: 분석 결과

        Returns:
            str: 권고 사항
        """
        if result.pass_fail == "FAIL":
            return "심각한 의료법 위반이 발견되었습니다. 광고 내용을 전면 수정하시기 바랍니다."
        elif result.pass_fail == "WARNING":
            return "일부 위반 사항이 있습니다. 해당 부분을 수정 후 재심의를 권장합니다."
        else:
            return "의료법 위반 사항이 발견되지 않았습니다. 사용 가능합니다."


# 편의 함수
def analyze_medical_ad_image(image_path: str, use_ai: bool = True) -> AnalysisResult:
    """
    의료 광고 이미지 분석 (편의 함수)

    Args:
        image_path: 이미지 파일 경로
        use_ai: GPT-4 분석 사용 여부

    Returns:
        AnalysisResult: 분석 결과
    """
    analyzer = MedicalAdAnalyzer()
    return analyzer.analyze_image(image_path, use_ai=use_ai)


if __name__ == "__main__":
    # 테스트
    import sys

    if len(sys.argv) > 1:
        image_path = sys.argv[1]
    else:
        # 기본 샘플 이미지
        image_path = "../samples/보톡스.jpg"

    print("="*60)
    print("통합 의료 광고 분석 엔진 테스트")
    print("="*60)

    result = analyze_medical_ad_image(image_path, use_ai=True)

    print("\n" + "="*60)
    print("📊 최종 결과")
    print("="*60)

    if result.success:
        print(f"판정: {result.pass_fail}")
        print(f"권고: {result.recommendation}")
        print(f"\n총 처리 시간: {result.total_processing_time:.2f}초")
        print(f"  - OCR: {result.ocr_processing_time:.2f}초")
        print(f"  - AI 분석: {result.ai_processing_time:.2f}초")
    else:
        print(f"❌ 실패: {result.error}")
