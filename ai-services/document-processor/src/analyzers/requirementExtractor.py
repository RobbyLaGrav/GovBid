from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List


@dataclass
class RequirementExtractor:
    keywords: List[str] = None

    def __post_init__(self) -> None:
        if self.keywords is None:
            self.keywords = [
                "must",
                "shall",
                "required",
                "deliver",
                "submit",
                "compliance",
            ]

    def extract(self, text: str) -> List[str]:
        requirements: List[str] = []
        for sentence in re.split(r"[\.\n]", text):
            normalized = sentence.strip()
            if not normalized:
                continue
            if any(keyword in normalized.lower() for keyword in self.keywords):
                requirements.append(normalized)

        return requirements[:50]
