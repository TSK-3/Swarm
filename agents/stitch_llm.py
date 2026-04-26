# agents/stitch_llm.py
import os
import requests
from typing import Optional
from keys import next_gemini

class StitchLLM:
    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-2.0-flash"):
        self.api_key = api_key or next_gemini()
        self.model = model

    def _call(self, task: str) -> str:
        response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent",
            headers={
                "Content-Type": "application/json",
            },
            params={
                "key": self.api_key,
            },
            json={
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": task}],
                    }
                ],
                "generationConfig": {
                    "maxOutputTokens": 8096,
                },
            },
            timeout=120,
        )

        if response.status_code != 200:
            raise RuntimeError(
                f"Gemini API error {response.status_code}: {response.text}"
            )

        data = response.json()

        # Extract text from Gemini response
        output_parts = []
        for candidate in data.get("candidates", []):
            for part in candidate.get("content", {}).get("parts", []):
                if "text" in part:
                    output_parts.append(part["text"])

        return "\n".join(output_parts)

    # swarms calls .run()
    def run(self, task: str, *args, **kwargs) -> str:
        return self._call(task)

    # some swarms internals call .__call__()
    def __call__(self, task: str, *args, **kwargs) -> str:
        return self._call(task)