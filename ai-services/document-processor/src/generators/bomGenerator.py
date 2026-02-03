from __future__ import annotations

from dataclasses import dataclass
from typing import List, Dict


@dataclass
class BOMGenerator:
    default_markup: float = 0.2

    def generate(self, solicitation_text: str) -> List[Dict]:
        base_cost = max(5000.0, len(solicitation_text) * 0.1)
        tiers = [
            {"tier": "aggressive", "markup": 0.05},
            {"tier": "competitive", "markup": 0.15},
            {"tier": "premium", "markup": 0.3},
        ]
        bom: List[Dict] = []
        for tier in tiers:
            total = base_cost * (1 + tier["markup"])
            bom.append(
                {
                    "tier": tier["tier"],
                    "base_cost": round(base_cost, 2),
                    "markup": tier["markup"],
                    "total": round(total, 2),
                }
            )
        return bom
