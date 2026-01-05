# Naver Cloud OCR API 공개 엔드포인트 설정 가이드

## 현재 문제
- API URL이 내부 네트워크용 주소 (10.223.123.60)로 해석됨
- 외부 서버에서 접근 불가능

## 필요한 정보

Naver Cloud Console에서 다음 정보를 확인하세요:

### 1. Console 접속
```
https://console.ncloud.com
```

### 2. OCR 서비스 페이지로 이동

**경로:**
```
AI·NAVER API > AI Service > OCR
```

또는

```
Services > AI Service > CLOVA OCR
```

### 3. API 호출 정보 확인

아래 탭에서 "API Gateway 호출" 정보를 확인하세요:

#### 필요한 정보:

1. **API Gateway Invoke URL** (공개 엔드포인트)
   ```
   예시: https://xxxxxxxx.apigw.ntruss.com/custom/v1/xxxxx/xxxxxxxxxxxxxxx

   또는

   https://naveropenapi.apigw.ntruss.com/...
   ```

2. **Secret Key** (기존과 동일할 수 있음)
   ```
   예시: Qml3YU5rQmRNaU5tZmZGd1ZrbG5NV2pKR1ZmWGFNS0c=
   ```

3. **추가로 필요할 수 있는 정보:**
   - X-NCP-APIGW-API-KEY-ID (API Key ID)
   - X-NCP-APIGW-API-KEY (API Key)

## OCR API 타입 확인

Naver Cloud OCR은 두 가지 타입이 있습니다:

### 타입 1: General OCR (범용)
```
URL: https://[service-id].apigw.ntruss.com/general/v1/[document-type]
헤더:
  - X-OCR-SECRET: {Secret Key}
```

### 타입 2: Custom OCR (커스텀)
```
URL: https://[apigw-id].apigw.ntruss.com/custom/v1/[domain]/[path]
헤더:
  - X-OCR-SECRET: {Secret Key}
  또는
  - X-NCP-APIGW-API-KEY-ID: {API Key ID}
  - X-NCP-APIGW-API-KEY: {API Key}
```

## 확인 체크리스트

- [ ] API Gateway Invoke URL 복사 (https://로 시작, apigw.ntruss.com 포함)
- [ ] Secret Key 확인
- [ ] API 타입 확인 (General / Custom)
- [ ] 추가 인증 키 필요 여부 확인

## 확인 후 진행 사항

위 정보를 확인한 후:
1. .env 파일 업데이트
2. OCR 테스트 스크립트 수정 (필요시)
3. 연결 테스트 재실행

---

**참고 문서:**
- Naver Cloud Platform OCR 가이드: https://guide.ncloud-docs.com/docs/ko/ocr-ocr-1-1
- API 명세서: https://api.ncloud-docs.com/docs/ai-naver-clovaocr-general

---

**작성일**: 2026년 1월 4일
