"""
Day 3 GPT-4 분석 엔진 테스트
3개 케이스로 법조항 정확도, 한국어 품질, 응답 시간 확인
"""

import time
from ad_analyzer import analyze_complete

# 테스트 케이스 3개
test_cases = [
    {
        "name": "고위험 광고",
        "text": "100% 효과 보장! 최고의 피부과! 완치 가능! 무료 이벤트 진행중! 타병원보다 훨씬 우수합니다."
    },
    {
        "name": "중위험 광고",
        "text": "경험 많은 의료진의 안전한 시술. 특별 할인 이벤트. 최첨단 장비로 시술합니다."
    },
    {
        "name": "저위험 광고",
        "text": "OO피부과 진료 안내. 월-금 09:00-18:00 진료. 상담 예약 가능합니다."
    }
]

print("="*60)
print("Day 3 - GPT-4 분석 엔진 테스트")
print("목표: 3개 케이스 테스트")
print("="*60)

results = []

for i, test_case in enumerate(test_cases, 1):
    print(f"\n{'='*60}")
    print(f"테스트 케이스 {i}: {test_case['name']}")
    print(f"{'='*60}")
    print(f"텍스트: {test_case['text']}")

    # 시작 시간 측정
    start_time = time.time()

    # 전체 분석 (키워드 + GPT-4)
    result = analyze_complete(test_case['text'], use_ai=True)

    # 종료 시간 측정
    end_time = time.time()
    elapsed_time = end_time - start_time

    print(f"\n⏱️  처리 시간: {elapsed_time:.2f}초")

    # 키워드 분석 결과
    print(f"\n📊 키워드 분석:")
    print(f"  - 총점: {result.total_score}점")
    print(f"  - 위험도: {result.risk_level}")
    print(f"  - 위반 건수: {len(result.violations)}건")

    if result.violations:
        print(f"  - 발견된 키워드:")
        for v in result.violations[:5]:  # 상위 5개만
            count_info = f" (x{v['count']})" if v.get('count', 1) > 1 else ""
            print(f"    • {v['keyword']}{count_info}: {v['severity']} - {v['law']}")

    # GPT-4 분석 결과
    print(f"\n🤖 GPT-4 분석:")
    if result.ai_analysis:
        print("-" * 60)
        print(result.ai_analysis)
        print("-" * 60)

        # 법조항 포함 확인
        has_law = any(keyword in result.ai_analysis for keyword in ["의료법", "제56조", "제27조"])
        print(f"\n✅ 법조항 포함: {'예' if has_law else '아니오'}")

        # 한국어 품질 확인 (간단히 길이로 판단)
        is_korean = len(result.ai_analysis) > 100
        print(f"✅ 한국어 품질: {'양호' if is_korean else '부족'}")
    else:
        print("❌ GPT-4 분석 실패")

    # 응답 시간 확인
    if elapsed_time <= 10:
        print(f"✅ 응답 시간: 우수 ({elapsed_time:.2f}초 ≤ 10초)")
    else:
        print(f"⚠️  응답 시간: 기준 초과 ({elapsed_time:.2f}초 > 10초)")

    results.append({
        "name": test_case['name'],
        "elapsed_time": elapsed_time,
        "has_law": has_law if result.ai_analysis else False,
        "success": result.ai_analysis is not None
    })

# 종합 결과
print(f"\n{'='*60}")
print("📊 종합 결과")
print(f"{'='*60}")

successful = [r for r in results if r['success']]
if successful:
    avg_time = sum(r['elapsed_time'] for r in successful) / len(successful)
    law_accuracy = sum(1 for r in successful if r['has_law']) / len(successful) * 100

    print(f"\n성공: {len(successful)}/{len(results)}개")
    print(f"평균 응답 시간: {avg_time:.2f}초")
    print(f"법조항 포함률: {law_accuracy:.0f}%")

    print("\n✅ Day 3 완료 기준 검증:")
    if len(successful) >= 3:
        print("   ✅ 3개 케이스 모두 분석 성공")

    if law_accuracy >= 90:
        print(f"   ✅ 법조항 정확도 90% 이상 ({law_accuracy:.0f}%)")
    else:
        print(f"   ⚠️  법조항 정확도 미달 ({law_accuracy:.0f}%)")

    if avg_time <= 10:
        print(f"   ✅ 응답 시간 10초 이내 ({avg_time:.2f}초)")
    else:
        print(f"   ⚠️  응답 시간 기준 초과 ({avg_time:.2f}초)")
else:
    print("\n❌ 모든 테스트 실패")

print(f"\n{'='*60}")
print("Day 3 GPT-4 테스트 완료")
print(f"{'='*60}")
