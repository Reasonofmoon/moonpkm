"""Gemini AI 통합 — BRAIN 자동완성, 요약, Context Pack 생성"""
import os
from typing import Any, Dict, List, Optional

from .config import get_config


def _get_client():
    """Gemini 클라이언트 초기화"""
    try:
        import google.generativeai as genai
        cfg = get_config()
        api_key = cfg.ai_api_key or os.environ.get("GEMINI_API_KEY", "")
        if not api_key:
            raise ValueError("GEMINI_API_KEY 미설정. ~/.config/moon/config.yaml 또는 환경변수 설정 필요")
        genai.configure(api_key=api_key)
        return genai.GenerativeModel(cfg.ai_model)
    except ImportError:
        raise ImportError("google-generativeai 미설치. pip install google-generativeai 실행")


def generate_brain_sections(
    title: str,
    raw_content: str,
    context_notes: Optional[List[str]] = None,
) -> Dict[str, str]:
    """노트 내용에서 BRAIN 섹션 자동 생성"""
    model = _get_client()
    context = ""
    if context_notes:
        context = "\n\n관련 노트:\n" + "\n".join(f"- {n}" for n in context_notes[:5])

    prompt = f"""다음 내용을 읽고 BRAIN 방법론에 따라 각 섹션을 한국어로 작성하세요.
각 섹션을 JSON으로 반환하세요.

제목: {title}
내용:
{raw_content[:2000]}
{context}

응답 형식 (JSON만):
{{
  "Background": "배경/맥락 (2-3문장)",
  "Resonance": "왜 흥미로운가 (1-2문장)",
  "Amplify": "핵심 인사이트와 활용법 (2-3문장)",
  "Integrate": "연결 가능한 개념과 노트 (2-3개 [[wikilink]] 포함)",
  "Navigate": "다음 행동 1개 (구체적 체크리스트 형식)"
}}"""

    import json
    response = model.generate_content(prompt)
    text = response.text.strip()
    # JSON 추출
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
    return json.loads(text)


def summarize_note(content: str, max_words: int = 100) -> str:
    """노트 간단 요약"""
    model = _get_client()
    prompt = f"""다음 노트를 {max_words}자 이내로 핵심만 한국어로 요약하세요:

{content[:3000]}

요약:"""
    response = model.generate_content(prompt)
    return response.text.strip()


def build_context_pack_ai(
    purpose: str,
    notes_content: List[Dict[str, str]],
) -> Dict[str, Any]:
    """AI로 Context Pack 자동 생성"""
    model = _get_client()

    notes_text = "\n\n".join(
        f"### {n['title']}\n{n['content'][:500]}"
        for n in notes_content[:10]
    )

    prompt = f"""다음 노트들을 바탕으로 '{purpose}'를 위한 Context Pack을 JSON으로 생성하세요.

노트들:
{notes_text}

JSON 응답:
{{
  "purpose": "{purpose}",
  "evidence": [
    {{"note": "노트 제목", "highlight": "핵심 인용구"}}
  ],
  "claims": ["내가 주장하고 싶은 것 1", "주장 2", "주장 3"],
  "constraints": "목표 대상, 분량, 금지 항목",
  "style": "톤/형식/예시",
  "suggested_outline": ["섹션 1", "섹션 2", "섹션 3"]
}}"""

    import json
    response = model.generate_content(prompt)
    text = response.text.strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
    return json.loads(text)


def rank_notes_by_relevance(query: str, notes: List[Any]) -> List[Any]:
    """AI로 노트 관련도 재순위화"""
    model = _get_client()
    note_list = "\n".join(f"{i+1}. {n.title}: {n.content[:200]}" for i, n in enumerate(notes[:15]))

    prompt = f"""다음 노트들 중 "{query}"에 가장 관련 있는 순서대로 번호를 나열하세요.
숫자만 쉼표로 구분해서 답하세요.

노트:
{note_list}

순서 (예: 3,1,5,2,4):"""

    response = model.generate_content(prompt)
    try:
        order = [int(x.strip()) - 1 for x in response.text.strip().split(",")]
        return [notes[i] for i in order if 0 <= i < len(notes)]
    except Exception:
        return notes
