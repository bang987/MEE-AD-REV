"""
간단한 Naver OCR 테스트
"""
import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

api_url = os.getenv("NAVER_OCR_API_URL")
secret_key = os.getenv("NAVER_OCR_SECRET_KEY")

print("API URL:", api_url[:60] + "...")
print("Secret Key:", secret_key[:20] + "...")

image_path = "../samples/가슴성형.jpg"

print(f"\n이미지 파일: {image_path}")
print("OCR 요청 전송 중...\n")

# 이미지 파일 읽기
with open(image_path, "rb") as f:
    image_data = f.read()

# 요청 본문
request_json = {
    "images": [
        {
            "format": "jpg",
            "name": "test_image"
        }
    ],
    "requestId": "test-001",
    "version": "V2",
    "timestamp": 0
}

# 헤더
headers = {
    "X-OCR-SECRET": secret_key
}

# 파일 데이터
files = {
    "message": (None, json.dumps(request_json), "application/json"),
    "file": ("test.jpg", image_data, "image/jpeg")
}

try:
    response = requests.post(api_url, headers=headers, files=files, timeout=30)

    print(f"응답 상태: {response.status_code}")

    if response.status_code == 200:
        result = response.json()

        # 추출된 텍스트
        extracted_text = ""
        if "images" in result and len(result["images"]) > 0:
            for field in result["images"][0].get("fields", []):
                text = field.get("inferText", "")
                extracted_text += text + " "

        print("✅ OCR 성공!")
        print(f"\n추출된 텍스트:\n{extracted_text.strip()}")
    else:
        print(f"❌ OCR 실패: {response.status_code}")
        print(f"응답: {response.text[:500]}")

except Exception as e:
    print(f"❌ 오류: {e}")
    import traceback
    traceback.print_exc()
