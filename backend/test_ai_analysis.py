"""
AI 광고 분석 테스트
"""
import requests

BASE_URL = "http://localhost:8000"


def test_ai_text_analysis():
    """AI를 사용한 텍스트 광고 분석"""
    print("\n" + "=" * 80)
    print("AI 텍스트 광고 분석 테스트")
    print("=" * 80)

    test_text = """
    ★최고의★ 성형외과! 100% 만족 보장!

    • 당일 수술 가능
    • 무료 상담 이벤트 진행중
    • 타병원보다 50% 저렴한 가격
    • 완치 보장! 영구적 효과!
    • 세계 최고 수준의 의료진
    • 업계 1위 성형외과

    ※ 선착순 100명 특별할인!
    ※ 사은품 증정!
    """

    data = {
        "text": test_text,
        "use_ai": True  # AI 분석 활성화
    }

    print("\n분석 중... (AI 분석은 10-30초 소요될 수 있습니다)")

    try:
        response = requests.post(
            f"{BASE_URL}/api/analyze",
            json=data,
            headers={"Content-Type": "application/json"},
            timeout=60
        )

        if response.status_code == 200:
            result = response.json()

            print(f"\n{'='*80}")
            print("✅ AI 분석 성공!")
            print(f"{'='*80}")

            # 키워드 기반 분석 결과
            print("\n📊 키워드 기반 분석 결과:")
            print(f"  위험도: {result['risk_level']}")
            print(f"  총점: {result['total_score']}")
            print(f"  위반 건수: {result['violation_count']}")
            print(f"  요약: {result['summary']}")

            # 발견된 위반 사항
            print("\n⚠️  발견된 위반 키워드:")
            for v in result['violations']:
                print(f"  • [{v['severity']}] {v['keyword']} - {v['category']}")

            # AI 분석 결과
            if result.get('ai_analysis'):
                print(f"\n{'='*80}")
                print("🤖 GPT-4 AI 심층 분석 결과:")
                print(f"{'='*80}")
                print(result['ai_analysis'])
            else:
                print("\n⚠️  AI 분석 결과를 받지 못했습니다.")

            return True
        else:
            print(f"❌ 실패: HTTP {response.status_code}")
            print(f"응답: {response.text}")
            return False

    except requests.exceptions.Timeout:
        print("❌ 요청 시간 초과")
        return False
    except Exception as e:
        print(f"❌ 오류: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_ai_ocr_analysis():
    """AI를 사용한 OCR + 광고 분석"""
    print("\n" + "=" * 80)
    print("AI OCR + 광고 분석 통합 테스트")
    print("=" * 80)

    image_path = "../samples/보톡스.jpg"

    print(f"\n이미지: {image_path}")
    print("분석 중... (OCR + AI 분석은 30-60초 소요될 수 있습니다)")

    try:
        with open(image_path, "rb") as f:
            files = {
                "file": (image_path.split("/")[-1], f, "image/jpeg")
            }

            response = requests.post(
                f"{BASE_URL}/api/ocr-analyze",
                files=files,
                data={"use_ai": "true"},  # AI 분석 활성화
                timeout=120
            )

        if response.status_code == 200:
            result = response.json()

            print(f"\n{'='*80}")
            print("✅ OCR + AI 분석 성공!")
            print(f"{'='*80}")

            # OCR 결과
            ocr = result['ocr_result']
            print("\n📄 OCR 결과:")
            print(f"  파일명: {result['filename']}")
            print(f"  신뢰도: {ocr['confidence']}")
            print(f"  필드 수: {ocr['fields_count']}")
            print(f"  처리 시간: {ocr['processing_time']:.2f}초")
            print("\n  추출된 텍스트:")
            print(f"  {ocr['text']}")

            # 분석 결과
            analysis = result['analysis_result']
            print("\n📊 광고 위반 분석:")
            print(f"  위험도: {analysis['risk_level']}")
            print(f"  총점: {analysis['total_score']}")
            print(f"  위반 건수: {analysis['violation_count']}")
            print(f"  요약: {analysis['summary']}")

            if analysis['violations']:
                print("\n  위반 키워드:")
                for v in analysis['violations']:
                    print(f"    • [{v['severity']}] {v['keyword']} - {v['category']}")

            # AI 분석 결과
            if analysis.get('ai_analysis'):
                print(f"\n{'='*80}")
                print("🤖 GPT-4 AI 심층 분석 결과:")
                print(f"{'='*80}")
                print(analysis['ai_analysis'])
            else:
                print("\n⚠️  AI 분석 결과를 받지 못했습니다.")

            return True
        else:
            print(f"❌ 실패: HTTP {response.status_code}")
            print(f"응답: {response.text}")
            return False

    except FileNotFoundError:
        print(f"❌ 파일을 찾을 수 없습니다: {image_path}")
        return False
    except requests.exceptions.Timeout:
        print("❌ 요청 시간 초과")
        return False
    except Exception as e:
        print(f"❌ 오류: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("\n" + "=" * 80)
    print("AI 광고 분석 테스트")
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
        return

    # 테스트 실행
    print("\n[1/2] 텍스트 AI 분석 테스트...")
    test_ai_text_analysis()

    print("\n\n[2/2] OCR + AI 분석 테스트...")
    test_ai_ocr_analysis()

    print("\n" + "=" * 80)
    print("AI 분석 테스트 완료!")
    print("=" * 80)


if __name__ == "__main__":
    main()
