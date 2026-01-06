"""
FastAPI OCR 엔드포인트 테스트 스크립트
"""

import requests
from pathlib import Path


def test_health_check():
    """헬스 체크 테스트"""
    print("\n" + "=" * 80)
    print("헬스 체크 테스트")
    print("=" * 80)

    try:
        response = requests.get("http://localhost:8000/health")

        if response.status_code == 200:
            result = response.json()
            print(f"✅ 상태: {result['status']}")
            print(f"메시지: {result['message']}")
            print(f"타임스탬프: {result['timestamp']}")
            return True
        else:
            print(f"❌ 실패: HTTP {response.status_code}")
            return False

    except Exception as e:
        print(f"❌ 오류: {e}")
        return False


def test_ocr_single_image(image_path: str):
    """단일 이미지 OCR 테스트"""
    print("\n" + "=" * 80)
    print(f"단일 이미지 OCR 테스트: {Path(image_path).name}")
    print("=" * 80)

    try:
        # 이미지 파일 열기
        with open(image_path, "rb") as f:
            files = {"file": (Path(image_path).name, f, "image/jpeg")}

            response = requests.post(
                "http://localhost:8000/api/ocr", files=files, timeout=60
            )

        if response.status_code == 200:
            result = response.json()

            print("✅ OCR 성공!")
            print(f"\n파일명: {result['filename']}")
            print(f"처리 시간: {result['processing_time']:.2f}초")
            print(f"신뢰도: {result['confidence']}%")
            print(f"필드 수: {result['fields_count']}")
            print("\n추출된 텍스트 (처음 200자):")
            print("-" * 80)
            text_preview = (
                result["text"][:200] + "..."
                if len(result["text"]) > 200
                else result["text"]
            )
            print(text_preview)
            print("-" * 80)

            return True
        else:
            print(f"❌ 실패: HTTP {response.status_code}")
            print(f"응답: {response.text[:200]}")
            return False

    except Exception as e:
        print(f"❌ 오류: {e}")
        return False


def test_ocr_batch(image_paths: list):
    """배치 이미지 OCR 테스트"""
    print("\n" + "=" * 80)
    print(f"배치 이미지 OCR 테스트 ({len(image_paths)}개 이미지)")
    print("=" * 80)

    try:
        files = []
        for image_path in image_paths:
            with open(image_path, "rb") as f:
                files.append(("files", (Path(image_path).name, f.read(), "image/jpeg")))

        response = requests.post(
            "http://localhost:8000/api/ocr/batch", files=files, timeout=120
        )

        if response.status_code == 200:
            results = response.json()

            print(f"✅ 배치 OCR 성공! (총 {len(results)}개)")

            for idx, result in enumerate(results, 1):
                print(f"\n[{idx}] {result['filename']}")
                if result["success"]:
                    print(f"  - 신뢰도: {result['confidence']}%")
                    print(f"  - 필드 수: {result['fields_count']}")
                    print(f"  - 처리 시간: {result['processing_time']:.2f}초")
                    text_preview = (
                        result["text"][:100] + "..."
                        if len(result["text"]) > 100
                        else result["text"]
                    )
                    print(f"  - 텍스트: {text_preview}")
                else:
                    print(f"  - ❌ 실패: {result['error']}")

            return True
        else:
            print(f"❌ 실패: HTTP {response.status_code}")
            print(f"응답: {response.text[:200]}")
            return False

    except Exception as e:
        print(f"❌ 오류: {e}")
        return False


def main():
    """메인 테스트 함수"""
    print("\n" + "=" * 80)
    print("FastAPI OCR 엔드포인트 테스트 시작")
    print("=" * 80)

    # 1. 헬스 체크
    health_ok = test_health_check()

    if not health_ok:
        print("\n⚠️  서버가 실행되지 않았거나 응답하지 않습니다.")
        print("다음 명령으로 서버를 먼저 실행하세요:")
        print("  python3 main.py")
        print("또는:")
        print("  uvicorn main:app --reload")
        return

    # 2. 단일 이미지 테스트
    sample_image = "../samples/가슴성형.jpg"
    if Path(sample_image).exists():
        test_ocr_single_image(sample_image)
    else:
        print(f"\n⚠️  테스트 이미지를 찾을 수 없습니다: {sample_image}")

    # 3. 배치 이미지 테스트 (3개만)
    samples_dir = Path("../samples")
    if samples_dir.exists():
        sample_images = list(samples_dir.glob("*.jpg"))[:3]
        if sample_images:
            test_ocr_batch([str(img) for img in sample_images])

    print("\n" + "=" * 80)
    print("테스트 완료!")
    print("=" * 80)


if __name__ == "__main__":
    main()
