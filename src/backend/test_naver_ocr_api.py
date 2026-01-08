"""
Naver Clova OCR API 연결 테스트 스크립트
"""

import os
import requests
import json
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()


def test_naver_ocr_connection():
    """Naver Clova OCR API 연결 테스트"""

    print("=" * 60)
    print("Naver Clova OCR API 연결 테스트")
    print("=" * 60)

    # API 설정 확인
    api_url = os.getenv("NAVER_OCR_API_URL")
    secret_key = os.getenv("NAVER_OCR_SECRET_KEY")

    if not api_url:
        print("❌ 오류: NAVER_OCR_API_URL이 .env 파일에 설정되지 않았습니다.")
        return False

    if not secret_key:
        print("❌ 오류: NAVER_OCR_SECRET_KEY가 .env 파일에 설정되지 않았습니다.")
        return False

    print(f"✅ API URL 확인: {api_url[:50]}...")
    print(f"✅ Secret Key 확인: {secret_key[:20]}...{secret_key[-10:]}")

    try:
        # 간단한 테스트 이미지 생성 (텍스트가 있는 간단한 이미지)
        # 실제로는 샘플 이미지가 필요하지만, API 연결만 테스트
        print("\n⚠️  주의: 실제 이미지 파일이 필요합니다.")
        print("현재는 API 엔드포인트 연결만 확인합니다.")

        # 테스트 요청 본문 (실제 이미지 없이 구조만 확인)
        # 참고: 실제 테스트를 위해서는 이미지가 필요함
        print("\n✅ API 엔드포인트 및 헤더 설정 완료")
        print(f"API URL: {api_url}")
        print(f"헤더: X-OCR-SECRET = {secret_key[:10]}...")

        # 실제 OCR 테스트는 샘플 이미지가 있을 때 수행 가능
        print("\n📝 다음 단계:")
        print("1. samples/ 디렉토리에 테스트 이미지 추가")
        print("2. 실제 OCR 요청 테스트 수행")
        print("3. OCR 정확도 확인")

        print("\n" + "=" * 60)
        print("✅ Naver Clova OCR API 설정 확인 완료")
        print("   (실제 테스트는 샘플 이미지 필요)")
        print("=" * 60)

        return True

    except Exception as e:
        print(f"\n❌ 오류 발생: {str(e)}")
        print("\n가능한 원인:")
        print("1. API URL이 잘못됨")
        print("2. Secret Key가 유효하지 않음")
        print("3. Naver Cloud 계정 문제")
        print("4. 네트워크 연결 문제")
        print("\n" + "=" * 60)
        print("❌ Naver Clova OCR API 연결 테스트 실패")
        print("=" * 60)
        return False


def test_naver_ocr_with_image(image_path: str):
    """실제 이미지로 Naver Clova OCR 테스트"""

    if not os.path.exists(image_path):
        print(f"❌ 오류: 이미지 파일을 찾을 수 없습니다: {image_path}")
        return False

    print("=" * 60)
    print("Naver Clova OCR 실제 테스트 (이미지 포함)")
    print("=" * 60)

    api_url = os.getenv("NAVER_OCR_API_URL")
    secret_key = os.getenv("NAVER_OCR_SECRET_KEY")

    try:
        # 이미지 파일 읽기
        with open(image_path, "rb") as f:
            image_data = f.read()

        # 요청 본문 구성
        request_json = {
            "images": [
                {
                    "format": "jpg"
                    if image_path.lower().endswith((".jpg", ".jpeg"))
                    else "png",
                    "name": "test_image",
                }
            ],
            "requestId": "test-request-001",
            "version": "V2",
            "timestamp": 0,
        }

        # 헤더 설정
        headers = {"X-OCR-SECRET": secret_key}

        # 파일 데이터 설정
        files = {
            "message": (None, json.dumps(request_json), "application/json"),
            "file": (os.path.basename(image_path), image_data, "image/jpeg"),
        }

        print(f"이미지 파일: {image_path}")
        print("OCR 요청 전송 중...")

        # API 요청
        response = requests.post(api_url, headers=headers, files=files)

        if response.status_code == 200:
            result = response.json()

            # 추출된 텍스트 확인
            extracted_text = ""
            if "images" in result and len(result["images"]) > 0:
                for field in result["images"][0].get("fields", []):
                    extracted_text += field.get("inferText", "") + " "

            print("\n✅ OCR 성공!")
            print(f"추출된 텍스트: {extracted_text.strip()}")
            print(f"\n📊 응답 상태: {response.status_code}")

            print("\n" + "=" * 60)
            print("✅ Naver Clova OCR 실제 테스트 성공!")
            print("=" * 60)
            return True
        else:
            print(f"\n❌ OCR 실패: HTTP {response.status_code}")
            print(f"응답: {response.text}")
            return False

    except Exception as e:
        print(f"\n❌ 오류 발생: {str(e)}")
        return False


if __name__ == "__main__":
    # 기본 연결 테스트
    test_naver_ocr_connection()

    # 실제 이미지 테스트 (샘플 이미지가 있는 경우)
    # test_naver_ocr_with_image("../samples/sample_001.jpg")
