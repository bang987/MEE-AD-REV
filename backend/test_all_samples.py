"""
모든 샘플 이미지로 Naver OCR 테스트
"""

import os
import requests
import json
import glob
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

api_url = os.getenv("NAVER_OCR_API_URL")
secret_key = os.getenv("NAVER_OCR_SECRET_KEY")


def test_ocr_image(image_path):
    """단일 이미지 OCR 테스트"""
    try:
        # 이미지 파일 읽기
        with open(image_path, "rb") as f:
            image_data = f.read()

        # 파일 확장자 확인
        file_ext = Path(image_path).suffix.lower()
        image_format = "jpg" if file_ext in [".jpg", ".jpeg"] else "png"

        # 요청 본문
        request_json = {
            "images": [{"format": image_format, "name": "test_image"}],
            "requestId": f"test-{Path(image_path).stem}",
            "version": "V2",
            "timestamp": 0,
        }

        # 헤더
        headers = {"X-OCR-SECRET": secret_key}

        # 파일 데이터
        files = {
            "message": (None, json.dumps(request_json), "application/json"),
            "file": (Path(image_path).name, image_data, f"image/{image_format}"),
        }

        # API 요청
        response = requests.post(api_url, headers=headers, files=files, timeout=30)

        if response.status_code == 200:
            result = response.json()

            # 추출된 텍스트
            extracted_text = ""
            if "images" in result and len(result["images"]) > 0:
                for field in result["images"][0].get("fields", []):
                    text = field.get("inferText", "")
                    extracted_text += text + " "

            return {
                "success": True,
                "text": extracted_text.strip(),
                "status_code": response.status_code,
            }
        else:
            return {
                "success": False,
                "error": f"HTTP {response.status_code}",
                "message": response.text[:200],
                "status_code": response.status_code,
            }

    except Exception as e:
        return {"success": False, "error": str(e), "message": ""}


def main():
    print("=" * 80)
    print("모든 샘플 이미지 OCR 테스트 시작")
    print("=" * 80)

    # 샘플 이미지 찾기
    samples_dir = "../samples"
    image_patterns = ["*.jpg", "*.jpeg", "*.png"]

    image_files = []
    for pattern in image_patterns:
        image_files.extend(glob.glob(os.path.join(samples_dir, pattern)))

    image_files.sort()

    if not image_files:
        print(f"❌ {samples_dir} 디렉토리에서 이미지를 찾을 수 없습니다.")
        return

    print(f"\n총 {len(image_files)}개의 이미지 파일 발견\n")

    # 각 이미지 테스트
    results = []
    for idx, image_path in enumerate(image_files, 1):
        filename = Path(image_path).name
        print(f"\n[{idx}/{len(image_files)}] 테스트 중: {filename}")
        print("-" * 80)

        result = test_ocr_image(image_path)
        results.append({"filename": filename, "path": image_path, **result})

        if result["success"]:
            print(f"✅ 성공 (HTTP {result['status_code']})")
            text_preview = (
                result["text"][:150] + "..."
                if len(result["text"]) > 150
                else result["text"]
            )
            print(f"추출된 텍스트: {text_preview}")
        else:
            print(f"❌ 실패: {result.get('error', 'Unknown error')}")
            if result.get("message"):
                print(f"메시지: {result['message'][:100]}")

    # 최종 결과 요약
    print("\n" + "=" * 80)
    print("테스트 결과 요약")
    print("=" * 80)

    success_count = sum(1 for r in results if r["success"])
    fail_count = len(results) - success_count

    print(f"\n총 테스트: {len(results)}개")
    print(f"✅ 성공: {success_count}개")
    print(f"❌ 실패: {fail_count}개")
    print(f"성공률: {success_count / len(results) * 100:.1f}%")

    # 실패한 이미지 목록
    if fail_count > 0:
        print("\n실패한 이미지:")
        for r in results:
            if not r["success"]:
                print(f"  - {r['filename']}: {r.get('error', 'Unknown')}")

    # 성공한 이미지 상세 결과
    print("\n" + "=" * 80)
    print("성공한 이미지 상세 결과")
    print("=" * 80)

    for r in results:
        if r["success"]:
            print(f"\n📄 {r['filename']}")
            print(f"텍스트 길이: {len(r['text'])} 글자")
            print(f"내용: {r['text'][:200]}{'...' if len(r['text']) > 200 else ''}")
            print("-" * 80)

    print("\n테스트 완료!")


if __name__ == "__main__":
    main()
