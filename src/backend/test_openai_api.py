"""
OpenAI GPT-4 API 연결 테스트 스크립트
"""

import os
from openai import OpenAI
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()


def test_openai_connection():
    """OpenAI GPT-4 API 연결 테스트"""

    print("=" * 60)
    print("OpenAI GPT-4 API 연결 테스트")
    print("=" * 60)

    # API 키 확인
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ 오류: OPENAI_API_KEY가 .env 파일에 설정되지 않았습니다.")
        return False

    print(f"✅ API 키 확인: {api_key[:20]}...{api_key[-10:]}")

    try:
        # OpenAI 클라이언트 초기화
        os.environ["OPENAI_API_KEY"] = api_key
        client = OpenAI()
        print("✅ OpenAI 클라이언트 초기화 성공")

        # 간단한 테스트 요청
        print("\n테스트 요청 전송 중...")
        response = client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=[
                {"role": "system", "content": "당신은 의료법 전문가입니다."},
                {
                    "role": "user",
                    "content": "의료법 제56조가 무엇인지 한 문장으로 설명해주세요.",
                },
            ],
            max_tokens=100,
            temperature=0.7,
        )

        # 응답 확인
        answer = response.choices[0].message.content
        print("\n✅ GPT-4 응답 성공!")
        print(f"응답 내용: {answer}")

        # 사용량 확인
        print("\n📊 토큰 사용량:")
        print(f"  - 입력 토큰: {response.usage.prompt_tokens}")
        print(f"  - 출력 토큰: {response.usage.completion_tokens}")
        print(f"  - 총 토큰: {response.usage.total_tokens}")

        # 비용 계산 (대략적)
        # gpt-4-turbo-preview: $0.01/1K input tokens, $0.03/1K output tokens
        input_cost = (response.usage.prompt_tokens / 1000) * 0.01
        output_cost = (response.usage.completion_tokens / 1000) * 0.03
        total_cost = input_cost + output_cost
        print(f"  - 예상 비용: ${total_cost:.4f}")

        print("\n" + "=" * 60)
        print("✅ OpenAI GPT-4 API 연결 테스트 성공!")
        print("=" * 60)

        return True

    except Exception as e:
        print(f"\n❌ 오류 발생: {str(e)}")
        print("\n가능한 원인:")
        print("1. API 키가 유효하지 않음")
        print("2. 결제 정보가 등록되지 않음")
        print("3. API 사용량 한도 초과")
        print("4. 네트워크 연결 문제")
        print("\n" + "=" * 60)
        print("❌ OpenAI GPT-4 API 연결 테스트 실패")
        print("=" * 60)
        return False


if __name__ == "__main__":
    test_openai_connection()
