from fastapi import FastAPI, Header, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional, List
from dotenv import load_dotenv
import os
import tempfile
import requests
import uuid
from gtts import gTTS
load_dotenv()

app = FastAPI(title="DublesMotion Music Inference", version="0.1.0")

MUSIC_INFERENCE_TOKEN = os.getenv("MUSIC_INFERENCE_TOKEN", "").strip()
MOCK_AUDIO_URL = os.getenv("MOCK_AUDIO_URL", "").strip()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GENERATED_DIR = os.path.join(BASE_DIR, "generated")
os.makedirs(GENERATED_DIR, exist_ok=True)

app.mount("/generated", StaticFiles(directory=GENERATED_DIR), name="generated")


class Segment(BaseModel):
    id: str
    startSec: int
    endSec: int
    label: str
    audioUrl: Optional[str] = None


class GenerateSongRequest(BaseModel):
    title: Optional[str] = ""
    prompt: str = Field(..., min_length=3)
    lyrics: Optional[str] = ""
    language: str = "en"
    durationSec: int = 30
    plan: str = "free"
    vocalType: str = "ai_female"
    voiceSampleUrl: Optional[str] = ""


class GenerateSongResponse(BaseModel):
    ok: bool
    audioUrl: str
    title: str
    lyrics: str
    durationSec: int
    segments: List[Segment]
    saveWarning: Optional[str] = None


def require_auth_token(authorization: Optional[str]) -> None:
    return
    if not MUSIC_INFERENCE_TOKEN:
        return

    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    expected = f"Bearer {MUSIC_INFERENCE_TOKEN}"
    if authorization.strip() != expected:
        raise HTTPException(status_code=401, detail="Invalid authorization token")


def get_max_duration_by_plan(plan: str) -> int:
    normalized = (plan or "free").strip().lower()
    if normalized in ("starter", "pro", "agency"):
        return 240
    return 60


def normalize_duration(value: int, plan: str) -> int:
    try:
        duration = int(value)
    except Exception:
        duration = 30

    duration = max(5, duration)
    duration = min(duration, get_max_duration_by_plan(plan))
    return duration


def build_segments(duration_sec: int) -> List[Segment]:
    segments: List[Segment] = []
    cursor = 0
    index = 1

    while cursor < duration_sec:
        end_sec = min(cursor + 30, duration_sec)
        segments.append(
            Segment(
                id=f"song-part-{index}",
                startSec=cursor,
                endSec=end_sec,
                label=f"Part {index}",
                audioUrl=None,
            )
        )
        cursor = end_sec
        index += 1

    return segments


GENERATED_DIR = "generated"

def generate_voice_from_lyrics(lyrics: str) -> str:
    if not lyrics.strip():
        raise Exception("Lyrics are required for TTS generation")

    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join(GENERATED_DIR, filename)

    tts = gTTS(text=lyrics[:3000], lang="en")
    tts.save(filepath)

    return f"/generated/{filename}"

@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "music-inference",
        "mockMode": bool(MOCK_AUDIO_URL),
    }


@app.post("/generate-song", response_model=GenerateSongResponse)
def generate_song(
    payload: GenerateSongRequest,
    authorization: Optional[str] = Header(default=None),
):
    require_auth_token(authorization)

    if payload.vocalType == "custom":
        raise HTTPException(
            status_code=400,
            detail="Custom voice is not active yet in the self-hosted inference service.",
        )

    duration_sec = normalize_duration(payload.durationSec, payload.plan)

    title = (payload.title or "").strip() or "Generated Song"
    lyrics = (payload.lyrics or "").strip()

    if lyrics:
        audio_url = generate_voice_from_lyrics(lyrics)
        warning = "TTS mode active"
    elif MOCK_AUDIO_URL:
        audio_url = MOCK_AUDIO_URL
        warning = "Mock mode active. YuE inference is not connected yet."
    else:
        raise HTTPException(
            status_code=400,
            detail="Lyrics required for voice generation",
        )

    return GenerateSongResponse(
        ok=True,
        audioUrl=audio_url,
        title=title,
        lyrics=lyrics,
        durationSec=duration_sec,
        segments=build_segments(duration_sec),
        saveWarning=warning,
    )