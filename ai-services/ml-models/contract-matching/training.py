from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List

from model import ContractMatchingModel

DEFAULT_KEYWORDS = ["cloud", "cybersecurity", "maintenance", "it", "network", "support"]


def train(keyword_weights: Dict[str, float]) -> ContractMatchingModel:
    return ContractMatchingModel(weights=keyword_weights)


def save_model(model: ContractMatchingModel, path: Path) -> None:
    payload = {"weights": model.weights}
    path.write_text(json.dumps(payload, indent=2))


def main() -> None:
    weights = {keyword: 1.0 for keyword in DEFAULT_KEYWORDS}
    weights.update({"cybersecurity": 1.5, "cloud": 1.4})
    model = train(weights)
    output_path = Path(__file__).parent / "model.json"
    save_model(model, output_path)
    print(f"Model saved to {output_path}")


if __name__ == "__main__":
    main()
