"""
PaddleOCR 모듈 - 한국어 OCR 지원
PaddleOCR의 korean 모델 사용 (PP-OCRv5)
"""
from pathlib import Path
import os

# PaddleOCR/PaddleX 관련 환경변수 설정 (import 전에 설정)
os.environ["PADDLE_SILENCE"] = "1"
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

_paddle_ocr_instance = None


def get_paddle_ocr_instance():
    """
    PaddleOCR 인스턴스를 싱글톤으로 관리
    PP-OCRv4 모델 사용, 한국어 지원
    """
    global _paddle_ocr_instance

    if _paddle_ocr_instance is None:
        try:
            from paddleocr import PaddleOCR

            _paddle_ocr_instance = PaddleOCR(
                lang='korean',           # 한국어 모델
            )
        except Exception as e:
            print(f"PaddleOCR 초기화 오류: {e}")
            raise e  # 에러를 상위로 전달

    return _paddle_ocr_instance


async def perform_paddle_ocr(image_path: Path) -> dict:
    """
    PaddleOCR을 사용하여 이미지에서 텍스트 추출

    Args:
        image_path: 이미지 파일 경로

    Returns:
        dict: {
            "success": bool,
            "text": str,
            "confidence": float,
            "fields_count": int,
            "error": str | None
        }
    """
    try:
        ocr = get_paddle_ocr_instance()

        # OCR 수행
        result = ocr.ocr(str(image_path))

        if result is None or len(result) == 0 or result[0] is None:
            return {
                "success": True,
                "text": "",
                "confidence": 0.0,
                "fields_count": 0,
                "error": None
            }

        # 결과 파싱 (다양한 형식 지원)
        extracted_texts = []
        confidences = []

        # result[0]이 OCRResult 객체인 경우 (PaddleX 최신 버전)
        ocr_result = result[0] if isinstance(result, list) and len(result) > 0 else result

        if ocr_result is None:
            return {
                "success": True,
                "text": "",
                "confidence": 0.0,
                "fields_count": 0,
                "error": None
            }

        # OCRResult 객체 처리 (PaddleX/PaddleOCR 최신 버전 - dict-like)
        if hasattr(ocr_result, 'get') and hasattr(ocr_result, 'keys'):
            # dict-like OCRResult 객체
            texts = ocr_result.get('rec_texts', []) or []
            scores = ocr_result.get('rec_scores', []) or []
            for i, text in enumerate(texts):
                if text and str(text).strip():  # 빈 문자열 제외
                    extracted_texts.append(str(text))
                    conf = scores[i] if i < len(scores) else 0.0
                    confidences.append(float(conf) if conf else 0.0)
        elif hasattr(ocr_result, 'rec_texts') and hasattr(ocr_result, 'rec_scores'):
            # 속성으로 접근하는 OCRResult 객체
            texts = ocr_result.rec_texts if ocr_result.rec_texts else []
            scores = ocr_result.rec_scores if ocr_result.rec_scores else []
            for i, text in enumerate(texts):
                if text and str(text).strip():
                    extracted_texts.append(str(text))
                    conf = scores[i] if i < len(scores) else 0.0
                    confidences.append(float(conf) if conf else 0.0)
        elif hasattr(ocr_result, '__iter__'):
            # 기존 리스트 형식
            for line in ocr_result:
                if line is None:
                    continue

                try:
                    # 새 API 형식: line이 dict인 경우
                    if isinstance(line, dict):
                        text = line.get('text', '') or line.get('rec_text', '')
                        conf = line.get('score', 0.0) or line.get('rec_score', 0.0)
                    # 기존 API 형식: line[1]이 (text, confidence) 튜플인 경우
                    elif isinstance(line, (list, tuple)) and len(line) >= 2:
                        if isinstance(line[1], (list, tuple)) and len(line[1]) >= 2:
                            text = str(line[1][0])
                            conf = float(line[1][1])
                        elif isinstance(line[1], dict):
                            text = line[1].get('text', '') or line[1].get('rec_text', '')
                            conf = line[1].get('score', 0.0) or line[1].get('rec_score', 0.0)
                        else:
                            continue
                    else:
                        continue

                    if text:
                        extracted_texts.append(text)
                        confidences.append(float(conf) if conf else 0.0)
                except (IndexError, TypeError, ValueError):
                    continue

        # 전체 텍스트 조합
        full_text = " ".join(extracted_texts)

        # 평균 신뢰도 계산
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        return {
            "success": True,
            "text": full_text.strip(),
            "confidence": round(avg_confidence, 2),
            "fields_count": len(extracted_texts),
            "error": None
        }

    except Exception as e:
        return {
            "success": False,
            "text": None,
            "confidence": None,
            "fields_count": None,
            "error": f"PaddleOCR 처리 중 오류: {str(e)}"
        }
