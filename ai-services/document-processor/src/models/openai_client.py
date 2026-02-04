from __future__ import annotations

from dataclasses import dataclass


@dataclass
class OpenAIClient:
    api_key: str
    model: str = "gpt-4o-mini"

    def summarize(self, text: str) -> str:
        return f"[openai:{self.model}] Summary placeholder for {len(text)} characters."

    def generate(self, prompt: str) -> str:
        return f"[openai:{self.model}] Generated response for: {prompt[:120]}..."
