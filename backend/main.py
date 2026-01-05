"""
FastAPI 백엔드 메인 애플리케이션
"""
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import requests
import json
from dotenv import load_dotenv
from pathlib import Path
import shutil
from datetime import datetime, timedelta
import asyncio
import uuid
from enum import Enum
from ad_analyzer import analyze_complete
from medical_keywords import keyword_db
from paddle_ocr import perform_paddle_ocr
from rag.vector_store import index_single_file, remove_file_from_index, get_vector_store


class OCREngine(str, Enum):
    """OCR 엔진 선택"""
    NAVER = "naver"
    PADDLE = "paddle"

# .env 파일 로드
load_dotenv()

# FastAPI 앱 생성
app = FastAPI(
    title="Medical Advertisement Review API",
    description="의료 광고 리뷰 및 OCR 분석 API",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Naver OCR API 설정
NAVER_OCR_API_URL = os.getenv("NAVER_OCR_API_URL")
NAVER_OCR_SECRET_KEY = os.getenv("NAVER_OCR_SECRET_KEY")
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


# 응답 모델
class OCRResponse(BaseModel):
    success: bool
    text: Optional[str] = None
    confidence: Optional[float] = None
    fields_count: Optional[int] = None
    error: Optional[str] = None
    filename: Optional[str] = None
    processing_time: Optional[float] = None


class HealthResponse(BaseModel):
    status: str
    message: str
    timestamp: str


@app.get("/", response_model=HealthResponse)
async def root():
    """루트 엔드포인트 - API 상태 확인"""
    return HealthResponse(
        status="ok",
        message="Medical Advertisement Review API is running",
        timestamp=datetime.now().isoformat()
    )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """헬스 체크 엔드포인트"""
    return HealthResponse(
        status="healthy",
        message="All systems operational",
        timestamp=datetime.now().isoformat()
    )


@app.post("/api/ocr", response_model=OCRResponse)
async def process_ocr(file: UploadFile = File(...)):
    """
    이미지 파일에서 텍스트 추출 (Naver Clova OCR)

    Args:
        file: 업로드된 이미지 파일 (jpg, jpeg, png)

    Returns:
        OCRResponse: OCR 처리 결과
    """
    start_time = datetime.now()

    # API 설정 확인
    if not NAVER_OCR_API_URL or not NAVER_OCR_SECRET_KEY:
        raise HTTPException(
            status_code=500,
            detail="OCR API 설정이 올바르지 않습니다. .env 파일을 확인하세요."
        )

    # 파일 확장자 검증
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ['.jpg', '.jpeg', '.png']:
        raise HTTPException(
            status_code=400,
            detail="지원하지 않는 파일 형식입니다. jpg, jpeg, png 파일만 업로드 가능합니다."
        )

    # 임시 파일 저장
    temp_file_path = UPLOAD_DIR / f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"

    try:
        # 파일 저장
        with temp_file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # OCR 처리
        result = await perform_ocr(temp_file_path)

        # 처리 시간 계산
        processing_time = (datetime.now() - start_time).total_seconds()
        result["processing_time"] = processing_time
        result["filename"] = file.filename

        return OCRResponse(**result)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"OCR 처리 중 오류가 발생했습니다: {str(e)}"
        )

    finally:
        # 임시 파일 삭제
        if temp_file_path.exists():
            temp_file_path.unlink()


async def perform_naver_ocr(image_path: Path) -> dict:
    """
    Naver Clova OCR API를 사용하여 이미지에서 텍스트 추출

    Args:
        image_path: 이미지 파일 경로

    Returns:
        dict: OCR 결과
    """
    try:
        # 이미지 파일 읽기
        with open(image_path, "rb") as f:
            image_data = f.read()

        # 파일 확장자 확인
        file_ext = image_path.suffix.lower()
        image_format = "jpg" if file_ext in ['.jpg', '.jpeg'] else "png"

        # 요청 본문 구성
        request_json = {
            "images": [
                {
                    "format": image_format,
                    "name": "medical_ad_image"
                }
            ],
            "requestId": f"ocr-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "version": "V2",
            "timestamp": 0
        }

        # 헤더 설정
        headers = {
            "X-OCR-SECRET": NAVER_OCR_SECRET_KEY
        }

        # 파일 데이터 설정
        files = {
            "message": (None, json.dumps(request_json), "application/json"),
            "file": (image_path.name, image_data, f"image/{image_format}")
        }

        # API 요청
        response = requests.post(
            NAVER_OCR_API_URL,
            headers=headers,
            files=files,
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()

            # 추출된 텍스트 및 신뢰도 계산
            extracted_text = ""
            total_confidence = 0.0
            fields_count = 0

            if "images" in result and len(result["images"]) > 0:
                fields = result["images"][0].get("fields", [])
                fields_count = len(fields)

                for field in fields:
                    text = field.get("inferText", "")
                    confidence = field.get("inferConfidence", 0.0)
                    extracted_text += text + " "
                    total_confidence += confidence

                # 평균 신뢰도 계산
                avg_confidence = total_confidence / fields_count if fields_count > 0 else 0.0
            else:
                avg_confidence = 0.0

            return {
                "success": True,
                "text": extracted_text.strip(),
                "confidence": round(avg_confidence, 2),
                "fields_count": fields_count,
                "error": None
            }
        else:
            return {
                "success": False,
                "text": None,
                "confidence": None,
                "fields_count": None,
                "error": f"OCR API 오류: HTTP {response.status_code} - {response.text[:200]}"
            }

    except requests.exceptions.Timeout:
        return {
            "success": False,
            "text": None,
            "confidence": None,
            "fields_count": None,
            "error": "OCR API 요청 시간 초과"
        }

    except Exception as e:
        return {
            "success": False,
            "text": None,
            "confidence": None,
            "fields_count": None,
            "error": f"OCR 처리 중 오류: {str(e)}"
        }


async def perform_ocr(image_path: Path, engine: OCREngine = OCREngine.NAVER) -> dict:
    """
    OCR 엔진 선택에 따라 적절한 OCR 수행

    Args:
        image_path: 이미지 파일 경로
        engine: OCR 엔진 선택 (naver 또는 paddle)

    Returns:
        dict: OCR 결과 (두 엔진 모두 동일한 형식)
    """
    if engine == OCREngine.PADDLE:
        return await perform_paddle_ocr(image_path)
    else:
        return await perform_naver_ocr(image_path)


@app.post("/api/ocr/batch")
async def process_batch_ocr(files: List[UploadFile] = File(...)):
    """
    여러 이미지 파일에서 텍스트 일괄 추출

    Args:
        files: 업로드된 이미지 파일 리스트

    Returns:
        List[OCRResponse]: OCR 처리 결과 리스트
    """
    if len(files) > 10:
        raise HTTPException(
            status_code=400,
            detail="한 번에 최대 10개의 파일만 업로드할 수 있습니다."
        )

    results = []

    for file in files:
        try:
            result = await process_ocr(file)
            results.append(result)
        except HTTPException as e:
            results.append(OCRResponse(
                success=False,
                filename=file.filename,
                error=e.detail
            ))
        except Exception as e:
            results.append(OCRResponse(
                success=False,
                filename=file.filename,
                error=str(e)
            ))

    return results


# 광고 분석 응답 모델
class AnalysisRequest(BaseModel):
    text: str
    use_ai: bool = False
    use_rag: bool = True  # RAG (법규 검색) 사용 여부


class AnalysisResponse(BaseModel):
    success: bool
    violations: List[Dict[str, Any]]
    total_score: int
    risk_level: str
    summary: str
    ai_analysis: Optional[str] = None
    violation_count: int
    error: Optional[str] = None


class OCRAnalysisResponse(BaseModel):
    success: bool
    ocr_result: Optional[Dict[str, Any]] = None
    analysis_result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    filename: Optional[str] = None


class BatchAnalysisStatus(BaseModel):
    batch_id: str
    status: str  # uploading, processing, completed, failed
    total_files: int
    processed_files: int
    progress_percent: float
    results: List[Dict[str, Any]]
    errors: List[str]
    start_time: Optional[str] = None
    estimated_completion: Optional[str] = None
    elapsed_seconds: Optional[float] = 0.0
    current_phase: Optional[str] = "uploading"  # uploading, analyzing


class FileClassification(BaseModel):
    filename: str
    category: str  # approved, rejected, review


class ClassifyRequest(BaseModel):
    batch_id: str
    classifications: List[FileClassification]


# 배치 분석 상태 저장소 (메모리)
batch_status_store: Dict[str, BatchAnalysisStatus] = {}


async def process_single_file_async(
    file_path: Path,
    filename: str,
    use_ai: bool,
    ocr_engine: OCREngine = OCREngine.NAVER,
    use_rag: bool = True
) -> Dict[str, Any]:
    """
    단일 파일 비동기 OCR + 분석

    Args:
        file_path: 파일 경로
        filename: 원본 파일명
        use_ai: AI 분석 사용 여부
        ocr_engine: OCR 엔진 선택
        use_rag: RAG (법규 검색) 사용 여부

    Returns:
        dict: 분석 결과
    """
    try:
        # OCR 처리
        ocr_result = await perform_ocr(file_path, engine=ocr_engine)

        if not ocr_result["success"]:
            return {
                "filename": filename,
                "success": False,
                "error": ocr_result.get("error", "OCR 실패"),
                "ocr_result": None,
                "analysis_result": None
            }

        # 광고 분석
        extracted_text = ocr_result["text"]
        analysis_result = analyze_complete(extracted_text, use_ai=use_ai, use_rag=use_rag)

        return {
            "filename": filename,
            "success": True,
            "ocr_result": {
                "text": ocr_result["text"],
                "confidence": ocr_result["confidence"],
                "fields_count": ocr_result["fields_count"]
            },
            "analysis_result": {
                "violations": analysis_result.violations,
                "total_score": analysis_result.total_score,
                "risk_level": analysis_result.risk_level,
                "summary": analysis_result.summary,
                "ai_analysis": analysis_result.ai_analysis,
                "violation_count": len(analysis_result.violations)
            },
            "error": None
        }

    except Exception as e:
        return {
            "filename": filename,
            "success": False,
            "error": f"처리 중 오류: {str(e)}",
            "ocr_result": None,
            "analysis_result": None
        }


async def batch_analyze_files(
    batch_id: str,
    file_paths: List[tuple],
    use_ai: bool,
    ocr_engine: OCREngine = OCREngine.NAVER,
    use_rag: bool = True,
    max_concurrent: int = 5
):
    """
    배치 파일 병렬 분석

    Args:
        batch_id: 배치 ID
        file_paths: [(파일경로, 원본파일명), ...] 리스트
        use_ai: AI 분석 사용 여부
        ocr_engine: OCR 엔진 선택
        use_rag: RAG (법규 검색) 사용 여부
        max_concurrent: 최대 동시 처리 수
    """
    semaphore = asyncio.Semaphore(max_concurrent)

    # 시작 시간 기록
    start_time = datetime.now()
    if batch_id in batch_status_store:
        batch_status_store[batch_id].start_time = start_time.isoformat()
        batch_status_store[batch_id].current_phase = "analyzing"

    async def process_with_semaphore(file_path: Path, filename: str):
        async with semaphore:
            result = await process_single_file_async(file_path, filename, use_ai, ocr_engine, use_rag)

            # 진행률 업데이트
            if batch_id in batch_status_store:
                batch_status_store[batch_id].processed_files += 1

                # 진행률 계산
                progress = (
                    batch_status_store[batch_id].processed_files /
                    batch_status_store[batch_id].total_files * 100
                )
                batch_status_store[batch_id].progress_percent = progress

                # 경과 시간 및 예상 완료 시간 계산
                elapsed = (datetime.now() - start_time).total_seconds()
                batch_status_store[batch_id].elapsed_seconds = elapsed

                if batch_status_store[batch_id].processed_files > 0:
                    avg_time_per_file = elapsed / batch_status_store[batch_id].processed_files
                    remaining_files = (
                        batch_status_store[batch_id].total_files -
                        batch_status_store[batch_id].processed_files
                    )
                    # 병렬 처리를 고려한 예상 시간 (남은 파일 / 동시 처리 수)
                    estimated_remaining = (remaining_files / max_concurrent) * avg_time_per_file
                    estimated_completion = datetime.now() + timedelta(seconds=estimated_remaining)
                    batch_status_store[batch_id].estimated_completion = estimated_completion.isoformat()

                batch_status_store[batch_id].results.append(result)

                if not result["success"]:
                    batch_status_store[batch_id].errors.append(
                        f"{filename}: {result.get('error', '알 수 없는 오류')}"
                    )

            return result

    try:
        # 모든 파일 병렬 처리
        tasks = [process_with_semaphore(path, name) for path, name in file_paths]
        await asyncio.gather(*tasks, return_exceptions=True)

        # 상태 업데이트
        if batch_id in batch_status_store:
            batch_status_store[batch_id].status = "completed"

            # 결과를 JSON 파일로 저장
            batch_results_dir = Path("uploads/batch_results")
            batch_results_file = batch_results_dir / f"{batch_id}.json"

            with open(batch_results_file, "w", encoding="utf-8") as f:
                json.dump({
                    "batch_id": batch_id,
                    "total_files": batch_status_store[batch_id].total_files,
                    "processed_files": batch_status_store[batch_id].processed_files,
                    "results": batch_status_store[batch_id].results,
                    "errors": batch_status_store[batch_id].errors,
                    "completed_at": datetime.now().isoformat()
                }, f, ensure_ascii=False, indent=2)

    except Exception as e:
        if batch_id in batch_status_store:
            batch_status_store[batch_id].status = "failed"
            batch_status_store[batch_id].errors.append(f"배치 처리 실패: {str(e)}")


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_advertisement(request: AnalysisRequest):
    """
    텍스트 광고 위반 분석

    Args:
        request: 분석 요청 (텍스트, AI 사용 여부)

    Returns:
        AnalysisResponse: 광고 분석 결과
    """
    try:
        result = analyze_complete(request.text, use_ai=request.use_ai, use_rag=request.use_rag)

        return AnalysisResponse(
            success=True,
            violations=result.violations,
            total_score=result.total_score,
            risk_level=result.risk_level,
            summary=result.summary,
            ai_analysis=result.ai_analysis,
            violation_count=len(result.violations),
            error=None
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"분석 중 오류가 발생했습니다: {str(e)}"
        )


@app.get("/api/keywords")
async def get_keywords():
    """
    금지 키워드 목록 조회

    Returns:
        dict: 키워드 목록 및 통계
    """
    try:
        # 전체 키워드 목록
        all_keywords = keyword_db.get_all_keywords()

        # 카테고리별 키워드
        categories = keyword_db.get_categories()
        keywords_by_category = {}
        for category in categories:
            keywords_by_category[category] = keyword_db.get_keywords_by_category(category)

        # 심각도별 키워드
        keywords_by_severity = {
            "HIGH": keyword_db.get_keywords_by_severity("HIGH"),
            "MEDIUM": keyword_db.get_keywords_by_severity("MEDIUM"),
            "LOW": keyword_db.get_keywords_by_severity("LOW")
        }

        # 통계
        stats = keyword_db.get_statistics()

        return {
            "success": True,
            "total_count": len(all_keywords),
            "keywords": all_keywords,
            "categories": categories,
            "keywords_by_category": keywords_by_category,
            "keywords_by_severity": keywords_by_severity,
            "statistics": stats
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"키워드 조회 중 오류가 발생했습니다: {str(e)}"
        )


@app.post("/api/ocr-analyze", response_model=OCRAnalysisResponse)
async def process_ocr_and_analyze(
    file: UploadFile = File(...),
    use_ai: str = Form("false"),
    use_rag: str = Form("true"),
    ocr_engine: str = Form("naver")
):
    """
    이미지 OCR + 광고 위반 분석 통합

    Args:
        file: 업로드된 이미지 파일
        use_ai: AI 분석 사용 여부 ("true"/"false")
        use_rag: RAG (법규 검색) 사용 여부 ("true"/"false")
        ocr_engine: OCR 엔진 선택 (naver 또는 paddle)

    Returns:
        OCRAnalysisResponse: OCR 및 분석 결과
    """
    start_time = datetime.now()

    # 문자열을 boolean으로 변환
    use_ai_bool = use_ai.lower() == "true"
    use_rag_bool = use_rag.lower() == "true"

    # OCR 엔진 결정
    engine = OCREngine(ocr_engine) if ocr_engine in ["naver", "paddle"] else OCREngine.NAVER

    # Naver OCR 선택 시에만 API 키 검증
    if engine == OCREngine.NAVER:
        if not NAVER_OCR_API_URL or not NAVER_OCR_SECRET_KEY:
            raise HTTPException(
                status_code=500,
                detail="Naver OCR API 설정이 올바르지 않습니다."
            )

    # 파일 확장자 검증
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ['.jpg', '.jpeg', '.png']:
        raise HTTPException(
            status_code=400,
            detail="지원하지 않는 파일 형식입니다. jpg, jpeg, png 파일만 업로드 가능합니다."
        )

    # 임시 파일 저장
    temp_file_path = UPLOAD_DIR / f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"

    try:
        # 파일 저장
        with temp_file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 1. OCR 처리
        ocr_result = await perform_ocr(temp_file_path, engine=engine)

        if not ocr_result["success"]:
            return OCRAnalysisResponse(
                success=False,
                error=ocr_result.get("error", "OCR 실패"),
                filename=file.filename
            )

        # 2. 광고 분석
        extracted_text = ocr_result["text"]
        analysis_result = analyze_complete(extracted_text, use_ai=use_ai_bool, use_rag=use_rag_bool)

        # 처리 시간 계산
        processing_time = (datetime.now() - start_time).total_seconds()

        return OCRAnalysisResponse(
            success=True,
            ocr_result={
                "text": ocr_result["text"],
                "confidence": ocr_result["confidence"],
                "fields_count": ocr_result["fields_count"],
                "processing_time": processing_time
            },
            analysis_result={
                "violations": analysis_result.violations,
                "total_score": analysis_result.total_score,
                "risk_level": analysis_result.risk_level,
                "summary": analysis_result.summary,
                "ai_analysis": analysis_result.ai_analysis,
                "violation_count": len(analysis_result.violations)
            },
            filename=file.filename
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"처리 중 오류가 발생했습니다: {str(e)}"
        )

    finally:
        # 임시 파일 삭제
        if temp_file_path.exists():
            temp_file_path.unlink()


@app.post("/api/batch-upload-analyze")
async def batch_upload_analyze(
    files: List[UploadFile] = File(...),
    use_ai: str = Form("false"),
    use_rag: str = Form("true"),
    ocr_engine: str = Form("naver"),
    background_tasks: BackgroundTasks = None
):
    """
    다중 파일 업로드 및 배치 분석

    Args:
        files: 업로드된 이미지 파일 리스트 (최대 50개)
        use_ai: AI 분석 사용 여부 ("true"/"false")
        use_rag: RAG (법규 검색) 사용 여부 ("true"/"false")
        ocr_engine: OCR 엔진 선택 (naver 또는 paddle)
        background_tasks: 백그라운드 작업

    Returns:
        dict: batch_id 및 초기 상태
    """
    # 문자열을 boolean으로 변환
    use_ai_bool = use_ai.lower() == "true"
    use_rag_bool = use_rag.lower() == "true"

    # OCR 엔진 결정
    engine = OCREngine(ocr_engine) if ocr_engine in ["naver", "paddle"] else OCREngine.NAVER

    # 파일 수 제한
    if len(files) > 50:
        raise HTTPException(
            status_code=400,
            detail="한 번에 최대 50개의 파일만 업로드할 수 있습니다."
        )

    if len(files) == 0:
        raise HTTPException(
            status_code=400,
            detail="최소 1개 이상의 파일을 업로드해야 합니다."
        )

    # 배치 ID 생성
    batch_id = f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"

    # 배치 전용 임시 폴더 생성
    batch_temp_dir = Path("uploads/temp") / batch_id
    batch_temp_dir.mkdir(parents=True, exist_ok=True)

    file_paths = []

    try:
        # 파일 저장
        for file in files:
            # 파일 확장자 검증
            file_ext = Path(file.filename).suffix.lower()
            if file_ext not in ['.jpg', '.jpeg', '.png']:
                raise HTTPException(
                    status_code=400,
                    detail=f"지원하지 않는 파일 형식입니다: {file.filename}. jpg, jpeg, png 파일만 업로드 가능합니다."
                )

            # 파일 저장
            file_path = batch_temp_dir / file.filename
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            file_paths.append((file_path, file.filename))

        # 배치 상태 초기화
        batch_status_store[batch_id] = BatchAnalysisStatus(
            batch_id=batch_id,
            status="processing",
            total_files=len(files),
            processed_files=0,
            progress_percent=0.0,
            results=[],
            errors=[]
        )

        # 백그라운드에서 배치 분석 시작
        background_tasks.add_task(batch_analyze_files, batch_id, file_paths, use_ai_bool, engine, use_rag_bool)

        return {
            "success": True,
            "batch_id": batch_id,
            "total_files": len(files),
            "message": "배치 분석이 시작되었습니다. /api/batch-status/{batch_id}로 진행 상태를 확인하세요."
        }

    except Exception as e:
        # 오류 발생 시 임시 파일 삭제
        if batch_temp_dir.exists():
            shutil.rmtree(batch_temp_dir)

        raise HTTPException(
            status_code=500,
            detail=f"파일 업로드 중 오류가 발생했습니다: {str(e)}"
        )


@app.get("/api/batch-status/{batch_id}")
async def get_batch_status(batch_id: str):
    """
    배치 분석 진행 상태 조회

    Args:
        batch_id: 배치 ID

    Returns:
        BatchAnalysisStatus: 배치 분석 상태
    """
    # 메모리에서 확인
    if batch_id in batch_status_store:
        return batch_status_store[batch_id]

    # JSON 파일에서 확인 (완료된 배치)
    batch_results_file = Path("uploads/batch_results") / f"{batch_id}.json"
    if batch_results_file.exists():
        with open(batch_results_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            return BatchAnalysisStatus(
                batch_id=data["batch_id"],
                status="completed",
                total_files=data["total_files"],
                processed_files=data["processed_files"],
                progress_percent=100.0,
                results=data["results"],
                errors=data.get("errors", [])
            )

    raise HTTPException(
        status_code=404,
        detail=f"배치 ID '{batch_id}'를 찾을 수 없습니다."
    )


@app.post("/api/classify-files")
async def classify_files(request: ClassifyRequest):
    """
    분석 결과에 따라 파일 분류 및 이동

    Args:
        request: 배치 ID 및 파일 분류 정보

    Returns:
        dict: 분류 결과
    """
    batch_id = request.batch_id
    classifications = request.classifications

    # 배치 임시 폴더 확인
    batch_temp_dir = Path("uploads/temp") / batch_id
    if not batch_temp_dir.exists():
        raise HTTPException(
            status_code=404,
            detail=f"배치 폴더를 찾을 수 없습니다: {batch_id}"
        )

    # 분류 폴더
    approved_dir = Path("uploads/approved")
    rejected_dir = Path("uploads/rejected")
    review_dir = Path("uploads/review")

    success_count = 0
    failed_count = 0
    errors = []

    for classification in classifications:
        filename = classification.filename
        category = classification.category

        source_path = batch_temp_dir / filename

        if not source_path.exists():
            errors.append(f"{filename}: 파일을 찾을 수 없습니다.")
            failed_count += 1
            continue

        # 대상 폴더 결정
        if category == "approved":
            dest_dir = approved_dir
        elif category == "rejected":
            dest_dir = rejected_dir
        elif category == "review":
            dest_dir = review_dir
        else:
            errors.append(f"{filename}: 알 수 없는 카테고리 '{category}'")
            failed_count += 1
            continue

        try:
            # 파일 이동
            dest_path = dest_dir / filename

            # 파일명 중복 시 타임스탬프 추가
            if dest_path.exists():
                file_stem = dest_path.stem
                file_ext = dest_path.suffix
                dest_path = dest_dir / f"{file_stem}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{file_ext}"

            shutil.move(str(source_path), str(dest_path))
            success_count += 1

        except Exception as e:
            errors.append(f"{filename}: 이동 중 오류 - {str(e)}")
            failed_count += 1

    # 배치 임시 폴더 삭제 (비어있으면)
    try:
        if batch_temp_dir.exists() and not any(batch_temp_dir.iterdir()):
            batch_temp_dir.rmdir()
    except Exception:
        pass

    return {
        "success": True,
        "batch_id": batch_id,
        "total_files": len(classifications),
        "success_count": success_count,
        "failed_count": failed_count,
        "errors": errors
    }


# ============================================================
# 관리자 API - RAG 문서 관리
# ============================================================

# RAG 문서 저장 폴더
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)


@app.get("/api/admin/documents")
async def get_documents():
    """
    RAG 문서 목록 조회

    Returns:
        dict: 문서 목록
    """
    try:
        documents = []
        supported_extensions = [".txt", ".pdf"]

        for file_path in DATA_DIR.iterdir():
            if file_path.is_file() and file_path.suffix.lower() in supported_extensions:
                stat = file_path.stat()
                documents.append({
                    "filename": file_path.name,
                    "size": stat.st_size,
                    "type": file_path.suffix.lower().replace(".", ""),
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
                })

        # 파일명 기준 정렬
        documents.sort(key=lambda x: x["filename"])

        return {
            "success": True,
            "documents": documents,
            "total_count": len(documents)
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"문서 목록 조회 중 오류가 발생했습니다: {str(e)}"
        )


@app.post("/api/admin/documents")
async def upload_documents(files: List[UploadFile] = File(...)):
    """
    RAG 문서 업로드 (다중 파일)

    Args:
        files: 업로드할 파일 리스트 (.txt, .pdf)

    Returns:
        dict: 업로드 결과
    """
    supported_extensions = [".txt", ".pdf"]
    max_file_size = 50 * 1024 * 1024  # 50MB

    uploaded = []
    failed = []

    for file in files:
        filename = file.filename
        file_ext = Path(filename).suffix.lower()

        # 확장자 검증
        if file_ext not in supported_extensions:
            failed.append({"filename": filename, "reason": f"지원하지 않는 형식: {file_ext}"})
            continue

        # 파일 크기 검증
        content = await file.read()
        if len(content) > max_file_size:
            failed.append({"filename": filename, "reason": "파일 크기 초과 (최대 50MB)"})
            continue

        # 파일 저장
        try:
            # 보안: 경로 traversal 방지
            safe_filename = Path(filename).name
            file_path = DATA_DIR / safe_filename

            with open(file_path, "wb") as f:
                f.write(content)

            uploaded.append(safe_filename)

        except Exception as e:
            failed.append({"filename": filename, "reason": str(e)})

    # RAG 자동 재인덱싱
    indexed_chunks = 0
    indexed_files = []
    if uploaded:
        for filename in uploaded:
            file_path = DATA_DIR / filename
            chunks = index_single_file(str(file_path))
            if chunks > 0:
                indexed_chunks += chunks
                indexed_files.append({"filename": filename, "chunks": chunks})

    # 현재 총 인덱스 수
    total_index_count = get_vector_store().get_collection_count()

    return {
        "success": len(uploaded) > 0,
        "uploaded": uploaded,
        "failed": failed,
        "message": f"{len(uploaded)}개 파일 업로드 완료" + (f", {len(failed)}개 실패" if failed else ""),
        "rag_indexed": {
            "files": indexed_files,
            "total_chunks": indexed_chunks,
            "total_index_count": total_index_count
        }
    }


@app.delete("/api/admin/documents/{filename}")
async def delete_document(filename: str):
    """
    RAG 문서 삭제

    Args:
        filename: 삭제할 파일명

    Returns:
        dict: 삭제 결과
    """
    # 보안: 경로 traversal 방지
    safe_filename = Path(filename).name
    file_path = DATA_DIR / safe_filename

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"파일을 찾을 수 없습니다: {filename}"
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=400,
            detail=f"파일이 아닙니다: {filename}"
        )

    try:
        # RAG 인덱스에서 먼저 제거
        removed_chunks = remove_file_from_index(str(file_path))

        # 파일 삭제
        file_path.unlink()

        # 현재 총 인덱스 수
        total_index_count = get_vector_store().get_collection_count()

        return {
            "success": True,
            "message": f"{filename} 삭제 완료",
            "rag_removed": {
                "chunks_removed": removed_chunks,
                "total_index_count": total_index_count
            }
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"파일 삭제 중 오류가 발생했습니다: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("SERVER_HOST", "0.0.0.0")
    port = int(os.getenv("SERVER_PORT", "8000"))

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True
    )
