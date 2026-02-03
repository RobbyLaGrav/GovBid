from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ClaudeClient:
    api_key: str
    model: str = "claude-3-sonnet"

    def summarize(self, text: str) -> str:
        return f"[claude:{self.model}] Summary placeholder for {len(text)} characters."

    def generate(self, prompt: str) -> str:
        return f"[claude:{self.model}] Generated response for: {prompt[:120]}..."
