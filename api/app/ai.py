"""Дешёвая ИИ-модель через OpenAI-совместимый API: перевод чата и разбор объявлений сборщика."""
import json
import os
import urllib.request

BASE = os.getenv("AI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
KEY = os.getenv("AI_API_KEY", "").strip()
MODEL = os.getenv("AI_MODEL", "gpt-4o-mini")
enabled = bool(KEY)


def chat(system: str, user: str, json_mode: bool = False, max_tokens: int = 800) -> str:
    body = {"model": MODEL, "temperature": 0, "max_tokens": max_tokens,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    req = urllib.request.Request(f"{BASE}/chat/completions", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "Authorization": f"Bearer {KEY}"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.load(r)["choices"][0]["message"]["content"].strip()


LANG_NAMES = {"ru": "Russian", "sr": "Serbian (Latin script)"}


def translate(text: str, lang: str) -> str:
    return chat(f"Translate the user's chat message into {LANG_NAMES.get(lang, lang)}. Keep the meaning, tone, numbers, prices and names. "
                "If it is already in that language, return it unchanged. Reply with the translation only.", text)
