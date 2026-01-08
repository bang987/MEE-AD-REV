"""
Day 2 OCR 테스트 스크립트
샘플 이미지 3개로 OCR 정확도 및 응답 속도 테스트
"""

import os
import requests
import json
import time
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

NAVER_OCR_API_URL = os.getenv("NAVER_OCR_API_URL")
NAVER_OCR_SECRET_KEY = os.getenv("NAVER_OCR_SECRET_KEY")


def test_ocr_single_image(image_path: str):
    """단일 이미지 OCR 테스트"""

    if not os.path.exists(image_path):
        print(f"❌ 파일을 찾을 수 없습니다: {image_path}")
        return None

    print(f"\n{'=' * 60}")
    print(f"📄 파일: {os.path.basename(image_path)}")
    print(f"{'=' * 60}")

    try:
        # 시작 시간 측정
        start_time = time.time()

        # 이미지 파일 읽기
        with open(image_path, "rb") as f:
            image_data = f.read()

        # 파일 크기 출력
        file_size_kb = len(image_data) / 1024
        print(f"파일 크기: {file_size_kb:.1f} KB")

        # 요청 본문 구성
        file_ext = Path(image_path).suffix.lower()
        image_format = "jpg" if file_ext in [".jpg", ".jpeg"] else "png"

        request_json = {
            "images": [{"format": image_format, "name": "test_image"}],
            "requestId": f"test-{int(time.time())}",
            "version": "V2",
            "timestamp": 0,
        }

        # 헤더 설정
        headers = {"X-OCR-SECRET": NAVER_OCR_SECRET_KEY}

        # 파일 데이터 설정
        files = {
            "message": (None, json.dumps(request_json), "application/json"),
            "file": (os.path.basename(image_path), image_data, f"image/{image_format}"),
        }

        print("OCR 요청 전송 중...")

        # API 요청
        response = requests.post(
            NAVER_OCR_API_URL, headers=headers, files=files, timeout=30
        )

        # 종료 시간 측정
        end_time = time.time()
        elapsed_time = end_time - start_time

        if response.status_code == 200:
            result = response.json()

            # 추출된 텍스트 및 신뢰도 계산
            extracted_text = ""
            total_confidence = 0.0
            fields_count = 0

            if "images" in result and len(result["images"]) > 0:
                fields = result["images"][0].get("fields", [])
                fields_count = len(fields)

                for field in fields:
                    text = field.get("inferText", "")
                    confidence = field.get("inferConfidence", 0.0)
                    extracted_text += text + " "
                    total_confidence += confidence

                # 평균 신뢰도 계산
                avg_confidence = (
                    (total_confidence / fields_count * 100) if fields_count > 0 else 0.0
                )
            else:
                avg_confidence = 0.0

            # 결과 출력
            print("\n✅ OCR 성공!")
            print(f"⏱️  처리 시간: {elapsed_time:.2f}초")
            print(f"📊 신뢰도: {avg_confidence:.1f}%")
            print(f"📝 추출된 필드 수: {fields_count}개")
            print("\n추출된 텍스트:")
            print("-" * 60)
            print(extracted_text.strip())
            print("-" * 60)

            # 성능 평가
            if elapsed_time <= 5:
                print(f"✅ 응답 속도: 우수 ({elapsed_time:.2f}초 ≤ 5초)")
            else:
                print(f"⚠️  응답 속도: 기준 초과 ({elapsed_time:.2f}초 > 5초)")

            if avg_confidence >= 80:
                print(f"✅ 정확도: 우수 ({avg_confidence:.1f}% ≥ 80%)")
            else:
                print(f"⚠️  정확도: 기준 미달 ({avg_confidence:.1f}% < 80%)")

            return {
                "success": True,
                "filename": os.path.basename(image_path),
                "text": extracted_text.strip(),
                "confidence": avg_confidence,
                "fields_count": fields_count,
                "processing_time": elapsed_time,
            }
        else:
            print(f"\n❌ OCR 실패: HTTP {response.status_code}")
            print(f"응답: {response.text[:500]}")
            return {
                "success": False,
                "filename": os.path.basename(image_path),
                "error": f"HTTP {response.status_code}",
            }

    except Exception as e:
        print(f"\n❌ 오류 발생: {str(e)}")
        return {
            "success": False,
            "filename": os.path.basename(image_path),
            "error": str(e),
        }


def main():
    """Day 2 OCR 테스트 메인 함수"""

    print("\n" + "=" * 60)
    print("Day 2 - OCR 연동 테스트")
    print("목표: 샘플 이미지 3개 테스트")
    print("=" * 60)

    # API 설정 확인
    if not NAVER_OCR_API_URL or not NAVER_OCR_SECRET_KEY:
        print("\n❌ 오류: Naver OCR API 설정이 없습니다.")
        print("   .env 파일에 NAVER_OCR_API_URL과 NAVER_OCR_SECRET_KEY를 설정하세요.")
        return

    print("\n✅ API 설정 확인 완료")
    print(f"   URL: {NAVER_OCR_API_URL[:50]}...")

    # 테스트할 샘플 이미지 3개 선택
    samples_dir = Path(__file__).parent.parent / "samples"
    test_images = [
        samples_dir / "보톡스.jpg",  # 작은 파일 (18KB)
        samples_dir / "라식.jpg",  # 중간 파일 (58KB)
        samples_dir / "가슴성형.jpg",  # 큰 파일 (151KB)
    ]

    results = []

    # 각 이미지 테스트
    for image_path in test_images:
        result = test_ocr_single_image(str(image_path))
        if result:
            results.append(result)

    # 종합 결과
    print("\n" + "=" * 60)
    print("📊 종합 결과")
    print("=" * 60)

    successful = [r for r in results if r.get("success", False)]

    if successful:
        avg_time = sum(r["processing_time"] for r in successful) / len(successful)
        avg_confidence = sum(r["confidence"] for r in successful) / len(successful)

        print(f"\n성공: {len(successful)}/{len(results)}개")
        print(f"평균 처리 시간: {avg_time:.2f}초")
        print(f"평균 신뢰도: {avg_confidence:.1f}%")

        print("\n✅ Day 2 완료 기준 검증:")
        if len(successful) >= 3:
            print("   ✅ 샘플 이미지에서 텍스트 추출 성공")
        else:
            print("   ❌ 3개 이미지 중 일부만 성공")

        if avg_confidence >= 80:
            print(f"   ✅ 한글 정확도 80% 이상 확인 ({avg_confidence:.1f}%)")
        else:
            print(f"   ⚠️  한글 정확도 기준 미달 ({avg_confidence:.1f}% < 80%)")

        if avg_time <= 5:
            print(f"   ✅ 응답 속도 5초 이내 확인 ({avg_time:.2f}초)")
        else:
            print(f"   ⚠️  응답 속도 기준 초과 ({avg_time:.2f}초 > 5초)")
    else:
        print("\n❌ 모든 테스트 실패")

    print("\n" + "=" * 60)
    print("Day 2 테스트 완료")
    print("=" * 60)


if __name__ == "__main__":
    main()
