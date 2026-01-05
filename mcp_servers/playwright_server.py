"""
Playwright MCP 서버
웹 스크래핑, 스크린샷, DOM 조작 등을 지원
포트: 4000
"""

import asyncio
import json
from mcp.server import Server
from mcp.types import TextContent, Tool
from playwright.async_api import async_playwright
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

server = Server("playwright-mcp-server")

# 글로벌 playwright 인스턴스
_playwright = None
_browser = None
_context = None
_page = None


@server.tool()
async def open_browser(headless: bool = True) -> TextContent:
    """
    브라우저 인스턴스 시작

    Args:
        headless: 헤드리스 모드 여부 (기본값: True)

    Returns:
        브라우저 준비 상태
    """
    global _playwright, _browser, _context, _page

    try:
        _playwright = await async_playwright().start()
        _browser = await _playwright.chromium.launch(headless=headless)
        _context = await _browser.new_context()
        _page = await _context.new_page()

        logger.info("브라우저 인스턴스 시작 완료")
        return TextContent(
            type="text",
            text="✅ 브라우저 준비 완료"
        )
    except Exception as e:
        return TextContent(
            type="text",
            text=f"❌ 브라우저 시작 실패: {str(e)}"
        )


@server.tool()
async def navigate(url: str) -> TextContent:
    """
    웹페이지로 이동

    Args:
        url: 이동할 URL

    Returns:
        페이지 제목
    """
    global _page

    if _page is None:
        return TextContent(
            type="text",
            text="❌ 브라우저가 시작되지 않음. open_browser를 먼저 호출하세요"
        )

    try:
        await _page.goto(url, wait_until="networkidle")
        title = await _page.title()
        logger.info(f"페이지 이동 완료: {url}")
        return TextContent(
            type="text",
            text=f"✅ {url}로 이동\n페이지 제목: {title}"
        )
    except Exception as e:
        return TextContent(
            type="text",
            text=f"❌ 페이지 이동 실패: {str(e)}"
        )


@server.tool()
async def take_screenshot(path: str = "screenshot.png") -> TextContent:
    """
    현재 페이지의 스크린샷 캡처

    Args:
        path: 저장할 경로 (기본값: screenshot.png)

    Returns:
        저장 여부
    """
    global _page

    if _page is None:
        return TextContent(
            type="text",
            text="❌ 브라우저가 시작되지 않음"
        )

    try:
        await _page.screenshot(path=path)
        logger.info(f"스크린샷 저장 완료: {path}")
        return TextContent(
            type="text",
            text=f"✅ 스크린샷 저장 완료: {path}"
        )
    except Exception as e:
        return TextContent(
            type="text",
            text=f"❌ 스크린샷 저장 실패: {str(e)}"
        )


@server.tool()
async def extract_text() -> TextContent:
    """
    페이지의 모든 텍스트 추출

    Returns:
        페이지의 텍스트 내용
    """
    global _page

    if _page is None:
        return TextContent(
            type="text",
            text="❌ 브라우저가 시작되지 않음"
        )

    try:
        text_content = await _page.content()
        # HTML에서 스크립트 제거하고 텍스트만 추출
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(text_content, 'html.parser')
        text = soup.get_text()

        logger.info("텍스트 추출 완료")
        return TextContent(
            type="text",
            text=f"✅ 추출된 텍스트:\n{text[:2000]}..."
        )
    except Exception as e:
        return TextContent(
            type="text",
            text=f"❌ 텍스트 추출 실패: {str(e)}"
        )


@server.tool()
async def click_selector(selector: str) -> TextContent:
    """
    CSS 선택자로 요소 클릭

    Args:
        selector: CSS 선택자

    Returns:
        클릭 결과
    """
    global _page

    if _page is None:
        return TextContent(
            type="text",
            text="❌ 브라우저가 시작되지 않음"
        )

    try:
        await _page.click(selector)
        logger.info(f"요소 클릭 완료: {selector}")
        return TextContent(
            type="text",
            text=f"✅ 요소 클릭 완료: {selector}"
        )
    except Exception as e:
        return TextContent(
            type="text",
            text=f"❌ 요소 클릭 실패: {str(e)}"
        )


@server.tool()
async def close_browser() -> TextContent:
    """
    브라우저 인스턴스 종료

    Returns:
        종료 상태
    """
    global _playwright, _browser, _context, _page

    try:
        if _page:
            await _page.close()
        if _context:
            await _context.close()
        if _browser:
            await _browser.close()
        if _playwright:
            await _playwright.stop()

        _playwright = None
        _browser = None
        _context = None
        _page = None

        logger.info("브라우저 인스턴스 종료 완료")
        return TextContent(
            type="text",
            text="✅ 브라우저 종료 완료"
        )
    except Exception as e:
        return TextContent(
            type="text",
            text=f"❌ 브라우저 종료 실패: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn

    app = server.app
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=4000,
        log_level="info"
    )
