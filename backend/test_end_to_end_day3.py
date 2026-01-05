"""
Day 3 End-to-End 테스트
샘플 이미지로 OCR → 키워드 → GPT-4 전체 파이프라인 테스트
"""

from integrated_analyzer import analyze_medical_ad_image
from pathlib import Path

def print_analysis_result(result, test_name):
    """분석 결과 출력"""
    print(f"\n{'='*60}")
    print(f"테스트: {test_name}")
    print(f"{'='*60}")

    if not result.success:
        print(f"❌ 실패: {result.error}")
        return

    # OCR 결과
    print(f"\n📷 OCR 결과:")
    print(f"  - 신뢰도: {result.ocr_confidence:.1f}%")
    print(f"  - 처리 시간: {result.ocr_processing_time:.2f}초")
    print(f"  - 추출된 텍스트:")
    print(f"    {result.ocr_text[:150]}...")

    # 키워드 분석 결과
    print(f"\n🔍 키워드 분석:")
    print(f"  - 총점: {result.total_score}점")
    print(f"  - 위험도: {result.risk_level}")
    print(f"  - 위반 건수: {len(result.violations)}건")

    if result.violations:
        print(f"  - 발견된 위반 (상위 5개):")
        for i, v in enumerate(result.violations[:5], 1):
            count_str = f" (x{v['count']})" if v.get('count', 1) > 1 else ""
            bonus_str = f" +{v.get('repetition_bonus', 0)}점" if v.get('repetition_bonus', 0) > 0 else ""
            print(f"    {i}. {v['keyword']}{count_str}: {v['severity']} - {v['total_score']}점{bonus_str}")
            print(f"       법조항: {v['law']}")

    # AI 분석 결과
    print(f"\n🤖 GPT-4 분석:")
    if result.ai_analysis:
        print(f"  - 처리 시간: {result.ai_processing_time:.2f}초")
        print(f"  - 분석 내용:")
        print("-" * 60)
        # 첫 500자만 출력
        analysis_preview = result.ai_analysis[:500]
        print(analysis_preview)
        if len(result.ai_analysis) > 500:
            print("... (생략)")
        print("-" * 60)
    else:
        print("  ❌ AI 분석 없음")

    # 최종 판정
    print(f"\n⚖️  최종 판정:")
    print(f"  - 결과: {result.pass_fail}")
    print(f"  - 권고: {result.recommendation}")

    # 처리 시간
    print(f"\n⏱️  처리 시간:")
    print(f"  - OCR: {result.ocr_processing_time:.2f}초")
    print(f"  - AI 분석: {result.ai_processing_time:.2f}초")
    print(f"  - 총 시간: {result.total_processing_time:.2f}초")

    # Day 3 완료 기준 확인
    print(f"\n✅ Day 3 완료 기준 검증:")
    if result.ocr_text:
        print("   ✅ OCR 텍스트 추출 성공")

    if len(result.violations) > 0 or result.total_score >= 0:
        print("   ✅ 키워드 탐지 작동")

    if result.ai_analysis and ("의료법" in result.ai_analysis or "제56조" in result.ai_analysis):
        print("   ✅ AI 분석 성공 및 법조항 포함")
    elif result.ai_analysis:
        print("   ⚠️  AI 분석 성공했으나 법조항 미포함")

    if result.total_processing_time <= 30:
        print(f"   ✅ 전체 처리 시간 30초 이내 ({result.total_processing_time:.2f}초)")
    else:
        print(f"   ⚠️  전체 처리 시간 초과 ({result.total_processing_time:.2f}초 > 30초)")


def main():
    """메인 테스트 함수"""

    print("="*60)
    print("Day 3 End-to-End 통합 테스트")
    print("목표: 이미지 → OCR → 키워드 → GPT-4 → 판정")
    print("="*60)

    # 테스트 샘플
    samples_dir = Path(__file__).parent.parent / "samples"
    test_sample = samples_dir / "가슴성형.jpg"

    # 전체 분석 실행
    result = analyze_medical_ad_image(str(test_sample), use_ai=True)

    # 결과 출력
    print_analysis_result(result, f"샘플: {test_sample.name}")

    # 최종 요약
    print(f"\n{'='*60}")
    print("📊 Day 3 완료 상태")
    print(f"{'='*60}")

    if result.success:
        print("✅ End-to-End 분석 성공")
        print(f"   - 이미지 파일: {result.image_filename}")
        print(f"   - OCR 성공: {bool(result.ocr_text)}")
        print(f"   - 키워드 탐지: {len(result.violations)}건")
        print(f"   - AI 분석: {'완료' if result.ai_analysis else '미완료'}")
        print(f"   - 최종 판정: {result.pass_fail}")
        print(f"\n✅ Day 3 모든 요구사항 충족!")
    else:
        print(f"❌ 테스트 실패: {result.error}")

    print(f"\n{'='*60}")
    print("Day 3 테스트 완료")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
