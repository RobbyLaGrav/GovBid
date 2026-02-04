from __future__ import annotations

import json
from pathlib import Path
from typing import Dict

from model import PricePredictionModel


def load_model(path: Path) -> PricePredictionModel:
    payload = json.loads(path.read_text())
    return PricePredictionModel(
        coefficients=payload.get("coefficients", {}),
        intercept=payload.get("intercept", 0.0),
    )


def predict_price(model: PricePredictionModel, features: Dict[str, float]) -> float:
    return model.predict(features)


def main() -> None:
    model_path = Path(__file__).parent / "model.json"
    if not model_path.exists():
        raise SystemExit("Model file not found. Run training.py first.")

    model = load_model(model_path)
    sample_features = {
        "labor_hours": 50,
        "cloud_resources": 1,
        "on_site": 0,
        "security_clearance": 1,
    }
    prediction = predict_price(model, sample_features)
    print(f"Predicted price: ${prediction:,.2f}")


if __name__ == "__main__":
    main()
