from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Tuple


@dataclass
class SolicitationAnalyzer:
    risk_threshold: float = 0.6

    def summarize(self, text: str, compliance: Dict[str, bool]) -> Tuple[str, float]:
        missing = [term for term, present in compliance.items() if not present]
        risk_score = min(1.0, len(missing) / max(len(compliance), 1))
        summary = (
            f"Solicitation summary ({len(text)} chars). "
            f"Missing compliance signals: {', '.join(missing) if missing else 'none'}"
        )
        return summary, risk_score
