from __future__ import annotations

import json
from pathlib import Path
from typing import List

from model import ContractMatchingModel


def load_model(path: Path) -> ContractMatchingModel:
    payload = json.loads(path.read_text())
    return ContractMatchingModel(weights=payload.get("weights", {}))


def match_score(model: ContractMatchingModel, keywords: List[str], text: str) -> float:
    return model.score(keywords, text)


def main() -> None:
    model_path = Path(__file__).parent / "model.json"
    if not model_path.exists():
        raise SystemExit("Model file not found. Run training.py first.")

    model = load_model(model_path)
    sample_text = "We need cloud migration and cybersecurity support."
    keywords = ["cloud", "cybersecurity", "network"]
    score = match_score(model, keywords, sample_text)
    print(f"Match score: {score}")


if __name__ == "__main__":
    main()
