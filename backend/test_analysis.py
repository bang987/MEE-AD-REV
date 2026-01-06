"""
광고 분석 API 테스트 스크립트
"""

import requests

BASE_URL = "http://localhost:8000"


def test_text_analysis():
    """텍스트 광고 분석 테스트"""
    print("\n" + "=" * 80)
    print("텍스트 광고 분석 테스트")
    print("=" * 80)

    # 테스트 광고 텍스트
    test_text = """
    최고의 성형외과! 100% 만족 보장!
    당일 수술 가능, 무료 상담 이벤트 진행중
    타병원보다 저렴한 가격으로 최상의 결과를 약속드립니다.
    완치 보장! 영구적 효과!
    """

    data = {"text": test_text, "use_ai": False}

    try:
        response = requests.post(
            f"{BASE_URL}/api/analyze",
            json=data,
            headers={"Content-Type": "application/json"},
        )

        if response.status_code == 200:
            result = response.json()

            print("\n✅ 분석 성공!")
            print(f"\n위험도: {result['risk_level']}")
            print(f"총점: {result['total_score']}")
            print(f"위반 건수: {result['violation_count']}")
            print(f"\n요약: {result['summary']}")

            print("\n발견된 위반 사항:")
            print("-" * 80)
            for v in result["violations"]:
                print(f"  [{v['severity']}] {v['keyword']}")
                print(f"    카테고리: {v['category']}")
                print(f"    법조항: {v['law']}")
                print(f"    설명: {v['description']}")
                print(f"    문맥: {v['context']}")
                print()

            return True
        else:
            print(f"❌ 실패: HTTP {response.status_code}")
            print(f"응답: {response.text}")
            return False

    except Exception as e:
        print(f"❌ 오류: {e}")
        return False


def test_ocr_analysis():
    """OCR + 광고 분석 통합 테스트"""
    print("\n" + "=" * 80)
    print("OCR + 광고 분석 통합 테스트")
    print("=" * 80)

    image_path = "../samples/가슴성형.jpg"

    try:
        with open(image_path, "rb") as f:
            files = {"file": (image_path.split("/")[-1], f, "image/jpeg")}

            response = requests.post(
                f"{BASE_URL}/api/ocr-analyze", files=files, data={"use_ai": "false"}
            )

        if response.status_code == 200:
            result = response.json()

            print("\n✅ OCR + 분석 성공!")
            print(f"파일명: {result['filename']}")

            # OCR 결과
            ocr = result["ocr_result"]
            print("\n📄 OCR 결과:")
            print(f"  신뢰도: {ocr['confidence']}")
            print(f"  필드 수: {ocr['fields_count']}")
            print(f"  처리 시간: {ocr['processing_time']:.2f}초")
            print("  추출 텍스트 (처음 200자):")
            print(f"  {ocr['text'][:200]}...")

            # 분석 결과
            analysis = result["analysis_result"]
            print("\n⚠️  광고 위반 분석:")
            print(f"  위험도: {analysis['risk_level']}")
            print(f"  총점: {analysis['total_score']}")
            print(f"  위반 건수: {analysis['violation_count']}")
            print(f"  요약: {analysis['summary']}")

            if analysis["violations"]:
                print("\n  주요 위반 사항 (상위 5개):")
                for v in analysis["violations"][:5]:
                    print(f"    • {v['keyword']} ({v['severity']}) - {v['category']}")

            return True
        else:
            print(f"❌ 실패: HTTP {response.status_code}")
            print(f"응답: {response.text}")
            return False

    except FileNotFoundError:
        print(f"❌ 파일을 찾을 수 없습니다: {image_path}")
        return False
    except Exception as e:
        print(f"❌ 오류: {e}")
        return False


def main():
    """메인 테스트 함수"""
    print("\n" + "=" * 80)
    print("광고 분석 API 테스트 시작")
    print("=" * 80)

    # 서버 상태 확인
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code != 200:
            print("\n⚠️  서버가 실행되지 않았거나 응답하지 않습니다.")
            return
        print(f"\n✅ 서버 상태: {response.json()['status']}")
    except Exception as e:
        print(f"\n❌ 서버 연결 실패: {e}")
        print("다음 명령으로 서버를 먼저 실행하세요:")
        print("  uvicorn main:app --reload")
        return

    # 테스트 실행
    test_text_analysis()
    test_ocr_analysis()

    print("\n" + "=" * 80)
    print("테스트 완료!")
    print("=" * 80)
    print("\nAPI 문서: http://localhost:8000/docs")


if __name__ == "__main__":
    main()
