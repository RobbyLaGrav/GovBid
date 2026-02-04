from __future__ import annotations

from dataclasses import dataclass
from typing import Dict


@dataclass
class PricePredictionModel:
    coefficients: Dict[str, float]
    intercept: float = 0.0

    def predict(self, features: Dict[str, float]) -> float:
        total = self.intercept
        for name, value in features.items():
            total += self.coefficients.get(name, 0.0) * value
        return total
