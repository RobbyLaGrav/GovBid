from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List


@dataclass
class ContractMatchingModel:
    weights: Dict[str, float]

    def score(self, keywords: List[str], text: str) -> float:
        lowered = text.lower()
        total = 0.0
        for keyword in keywords:
            weight = self.weights.get(keyword, 1.0)
            if keyword.lower() in lowered:
                total += weight
        return total
