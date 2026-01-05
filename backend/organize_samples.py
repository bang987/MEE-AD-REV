"""
샘플 이미지 정리 및 확인 스크립트
"""

from pathlib import Path
from PIL import Image

def check_samples():
    """샘플 이미지 확인 및 통계"""

    samples_dir = Path("../samples")

    if not samples_dir.exists():
        print("❌ samples/ 디렉토리가 존재하지 않습니다.")
        return

    print("=" * 60)
    print("샘플 이미지 확인")
    print("=" * 60)

    # 이미지 파일 목록
    image_files = list(samples_dir.glob("*.jpg")) + list(samples_dir.glob("*.png"))

    if not image_files:
        print("❌ samples/ 디렉토리에 이미지가 없습니다.")
        print("\n📋 샘플 이미지 수집 가이드를 참고하세요:")
        print("   docs/샘플이미지_수집가이드.md")
        return

    print(f"\n✅ 총 {len(image_files)}개의 이미지 발견\n")

    # 카테고리별 분류
    categories = {
        "dermatology": "피부과",
        "dental": "치과",
        "plastic": "성형외과",
        "oriental": "한의원"
    }

    risk_levels = {
        "high": "고위험",
        "medium": "중위험",
        "low": "저위험"
    }

    stats = {cat: {"high": 0, "medium": 0, "low": 0} for cat in categories.keys()}

    print("📊 이미지 목록:")
    print("-" * 60)

    for img_path in sorted(image_files):
        filename = img_path.name

        try:
            # 이미지 정보 확인
            img = Image.open(img_path)
            width, height = img.size
            file_size = img_path.stat().st_size / (1024 * 1024)  # MB

            # 파일명 파싱
            category = None
            risk = None

            for cat_key, cat_name in categories.items():
                if filename.startswith(cat_key):
                    category = cat_key
                    break

            for risk_key in risk_levels.keys():
                if risk_key in filename:
                    risk = risk_key
                    break

            # 통계 업데이트
            if category and risk:
                stats[category][risk] += 1

            # 정보 출력
            cat_display = categories.get(category, "미분류")
            risk_display = risk_levels.get(risk, "미지정")

            print(f"  {filename}")
            print(f"    - 카테고리: {cat_display}")
            print(f"    - 위험도: {risk_display}")
            print(f"    - 크기: {width}x{height} ({file_size:.2f} MB)")

            # 경고 체크
            if width < 800 or height < 600:
                print("    ⚠️  해상도가 낮습니다 (최소 800x600 권장)")
            if file_size > 10:
                print("    ⚠️  파일 크기가 큽니다 (10MB 이하 권장)")

            print()

        except Exception as e:
            print(f"  ❌ {filename}: 이미지 열기 실패 - {e}\n")

    # 통계 요약
    print("=" * 60)
    print("📈 카테고리별 통계")
    print("=" * 60)

    for cat_key, cat_name in categories.items():
        total = sum(stats[cat_key].values())
        print(f"\n{cat_name}:")
        print(f"  - 고위험: {stats[cat_key]['high']}개")
        print(f"  - 중위험: {stats[cat_key]['medium']}개")
        print(f"  - 저위험: {stats[cat_key]['low']}개")
        print(f"  - 소계: {total}개")

    # 목표 대비 진행률
    print("\n" + "=" * 60)
    print("🎯 목표 대비 진행률")
    print("=" * 60)

    targets = {
        "dermatology": 3,
        "dental": 3,
        "plastic": 2,
        "oriental": 2
    }

    total_collected = 0
    total_target = 10

    for cat_key, cat_name in categories.items():
        collected = sum(stats[cat_key].values())
        target = targets[cat_key]
        total_collected += collected

        percentage = (collected / target * 100) if target > 0 else 0
        status = "✅" if collected >= target else "🔲"

        print(f"{status} {cat_name}: {collected}/{target}개 ({percentage:.0f}%)")

    overall_percentage = (total_collected / total_target * 100)
    print(f"\n전체 진행률: {total_collected}/{total_target}개 ({overall_percentage:.0f}%)")

    if total_collected >= total_target:
        print("\n🎉 목표 달성! 모든 샘플 이미지 수집 완료!")
    else:
        remaining = total_target - total_collected
        print(f"\n📝 {remaining}개의 이미지가 더 필요합니다.")

    print("=" * 60)


if __name__ == "__main__":
    check_samples()
