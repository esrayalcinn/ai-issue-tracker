"""Evaluate duplicate detection similarity scores and thresholds on sample_issues.json.

Run from backend/:
    uv run python evals/eval_duplicates.py
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.embeddings import embed_issue


def dot_product(a: list[float], b: list[float]) -> float:
    """Since embeddings are normalized to length 1, dot product == cosine similarity."""
    return sum(x * y for x, y in zip(a, b))


def main() -> None:
    data_path = Path(__file__).parent / "sample_issues.json"
    issues = json.loads(data_path.read_text(encoding="utf-8"))

    print(f"Embedding {len(issues)} sample issues locally...")
    vectors = [embed_issue(item["title"], item["description"]) for item in issues]

    # Compare every unique pair (i < j)
    pairs: list[tuple[float, bool, dict, dict]] = []
    for i in range(len(issues)):
        for j in range(i + 1, len(issues)):
            sim = dot_product(vectors[i], vectors[j])
            is_dup = (
                issues[i]["duplicate_group"] is not None
                and issues[i]["duplicate_group"] == issues[j]["duplicate_group"]
            )
            pairs.append((sim, is_dup, issues[i], issues[j]))

    pairs.sort(key=lambda x: x[0], reverse=True)

    print("\nTop 8 most similar pairs:")
    print("-" * 80)
    for sim, is_dup, a, b in pairs[:8]:
        tag = "TRUE DUP" if is_dup else "not dup "
        print(f"  {sim:.3f}  [{tag}]  {a['id']} vs {b['id']}")
        print(f"           A: {a['title']}")
        print(f"           B: {b['title']}")

    print("\nThreshold sweep (Precision & Recall):")
    print("-" * 55)
    print(f"  {'Threshold':<10} {'TP':<4} {'FP':<4} {'FN':<4} {'Precision':<11} {'Recall'}")
    for threshold in [0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80]:
        tp = sum(1 for sim, is_dup, _, _ in pairs if sim >= threshold and is_dup)
        fp = sum(1 for sim, is_dup, _, _ in pairs if sim >= threshold and not is_dup)
        fn = sum(1 for sim, is_dup, _, _ in pairs if sim < threshold and is_dup)
        precision = tp / (tp + fp) if (tp + fp) else 1.0
        recall = tp / (tp + fn) if (tp + fn) else 1.0
        print(f"  {threshold:<10.2f} {tp:<4} {fp:<4} {fn:<4} {precision:<11.2%} {recall:.2%}")


if __name__ == "__main__":
    main()
