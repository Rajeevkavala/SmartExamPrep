"""
Generate synthetic training data for the WeaknessDetector model.
Used before real user data is collected.
Strategy: sample features from plausible distributions,
          then compute ground-truth labels using the weighted formula.

Run: python ml/generate_synthetic_data.py
"""
import numpy as np
import pandas as pd
from pathlib import Path

np.random.seed(42)


def compute_weakness_score(
    accuracy: float,
    repeated_mistakes: int,
    avg_response_zscore: float,
    recent_slope: float,
    difficulty_sensitivity: float,
) -> float:
    """
    Ground-truth formula — MUST match WeaknessDetector._compute_formula() exactly.

    Weights:
        accuracy          0.40  → penalty = (1 - accuracy) * 100
        repeated_mistakes 0.20  → penalty = min(rm, 10) * 5  (max 50 pts)
        response_zscore   0.10  → penalty = max(z, 0) * 10
        recent_slope      0.20  → penalty = max(-slope, 0) * 50
        difficulty_sens   0.10  → penalty = sensitivity * 30
    """
    score = (
        0.40 * (1 - accuracy) * 100
        + 0.20 * min(repeated_mistakes, 10) * 5
        + 0.10 * max(avg_response_zscore, 0) * 10
        + 0.20 * max(-recent_slope, 0) * 50
        + 0.10 * difficulty_sensitivity * 30
    )
    return float(np.clip(score, 0, 100))


def generate(n_samples: int = 10_000) -> pd.DataFrame:
    """
    Sample features from realistic distributions and compute weakness scores.

    Distributions chosen to mimic real student data:
        - accuracy             : Beta(2, 2)   — symmetric, centered ~0.5
        - repeated_mistakes    : Poisson(2)   — most students have few repeats
        - avg_response_zscore  : Normal(0.2, 1.0) clipped to [-3, 3]
        - recent_slope         : Normal(0, 0.3) clipped to [-1, 1]
        - difficulty_sensitivity: Beta(1.5, 3) — skewed right (most struggle more on hard)
    """
    accuracy = np.random.beta(a=2, b=2, size=n_samples)
    repeated_mistakes = np.random.poisson(lam=2, size=n_samples).clip(0, 15)
    avg_response_zscore = np.random.normal(loc=0.2, scale=1.0, size=n_samples).clip(-3, 3)
    recent_slope = np.random.normal(loc=0, scale=0.3, size=n_samples).clip(-1, 1)
    difficulty_sensitivity = np.random.beta(a=1.5, b=3, size=n_samples)

    labels = [
        compute_weakness_score(acc, rm, rtz, rs, ds)
        for acc, rm, rtz, rs, ds in zip(
            accuracy,
            repeated_mistakes,
            avg_response_zscore,
            recent_slope,
            difficulty_sensitivity,
        )
    ]

    df = pd.DataFrame(
        {
            "accuracy": accuracy,
            "repeated_mistakes": repeated_mistakes,
            "avg_response_zscore": avg_response_zscore,
            "recent_slope": recent_slope,
            "difficulty_sensitivity": difficulty_sensitivity,
            "weakness_score": labels,
        }
    )
    return df


if __name__ == "__main__":
    df = generate(10_000)
    out_path = Path(__file__).parent / "data" / "synthetic_train.csv"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_path, index=False)

    print(f"✅ Generated {len(df)} samples → {out_path}")
    print("\n📊 Feature Statistics:")
    print(df.describe())

    print("\n🏷️  Weakness Score Distribution:")
    strong = (df["weakness_score"] <= 30).sum()
    moderate = ((df["weakness_score"] > 30) & (df["weakness_score"] <= 60)).sum()
    weak = (df["weakness_score"] > 60).sum()
    print(f"  Strong   (0–30):   {strong:5d} samples  ({strong/len(df)*100:.1f}%)")
    print(f"  Moderate (31–60):  {moderate:5d} samples  ({moderate/len(df)*100:.1f}%)")
    print(f"  Weak     (61–100): {weak:5d} samples  ({weak/len(df)*100:.1f}%)")
