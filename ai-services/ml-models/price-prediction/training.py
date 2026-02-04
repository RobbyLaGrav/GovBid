from __future__ import annotations

import json
from pathlib import Path
from typing import Dict

from model import PricePredictionModel


def train() -> PricePredictionModel:
    coefficients = {
        "labor_hours": 120.0,
        "cloud_resources": 2000.0,
        "on_site": 5000.0,
        "security_clearance": 2500.0,
    }
    intercept = 10000.0
    return PricePredictionModel(coefficients=coefficients, intercept=intercept)


def save_model(model: PricePredictionModel, path: Path) -> None:
    payload = {
        "coefficients": model.coefficients,
        "intercept": model.intercept,
    }
    path.write_text(json.dumps(payload, indent=2))


def main() -> None:
    model = train()
    output_path = Path(__file__).parent / "model.json"
    save_model(model, output_path)
    print(f"Model saved to {output_path}")


if __name__ == "__main__":
    main()
