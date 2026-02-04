from __future__ import annotations

from typing import Union


def extract_text(content: Union[bytes, str]) -> str:
    """Extract text from raw bytes or a string payload."""
    if isinstance(content, bytes):
        try:
            return content.decode("utf-8")
        except UnicodeDecodeError:
            return content.decode("latin-1", errors="ignore")
    return content
