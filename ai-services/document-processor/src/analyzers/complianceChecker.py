from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List


@dataclass
class ComplianceChecker:
    required_terms: List[str] = None

    def __post_init__(self) -> None:
        if self.required_terms is None:
            self.required_terms = [
                "insurance",
                "security",
                "background check",
                "certification",
                "report",
            ]

    def evaluate(self, requirements: List[str]) -> Dict[str, bool]:
        result: Dict[str, bool] = {}
        lowered = " ".join(requirements).lower()
        for term in self.required_terms:
            result[term] = term in lowered
        return result
