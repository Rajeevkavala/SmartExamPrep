"""
Evaluate the trained weakness model.

Computes:
  - Regression metrics  : MAE, R²
  - Classification report : Weak / Moderate / Strong labels
  - Confusion matrix

Run: python ml/model_evaluation.py
"""
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.metrics import (
    mean_absolute_error,
    r2_score,
    classification_report,
    confusion_matrix,
)

MODEL_PATH = Path(__file__).parent / "models" / "weakness_model.pkl"
DATA_PATH  = Path(__file__).parent / "data"   / "synthetic_train.csv"

FEATURE_COLS = [
    "accuracy",
    "repeated_mistakes",
    "avg_response_zscore",
    "recent_slope",
    "difficulty_sensitivity",
]
LABELS = ["Weak", "Moderate", "Strong"]


def score_to_label(score: float) -> str:
    """Map weakness score → human-readable category."""
    if score <= 30:
        return "Strong"
    if score <= 60:
        return "Moderate"
    return "Weak"


def evaluate() -> None:
    # ── Load artifacts ────────────────────────────────────────────────────────
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model not found at {MODEL_PATH}.\n"
            "Run  python ml/train_weakness_model.py  first."
        )
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Data not found at {DATA_PATH}.\n"
            "Run  python ml/generate_synthetic_data.py  first."
        )

    print("📦 Loading model & data...")
    model = joblib.load(MODEL_PATH)
    df    = pd.read_csv(DATA_PATH)

    X      = df[FEATURE_COLS]
    y_true = df["weakness_score"].values
    y_pred = np.clip(model.predict(X.values), 0, 100)

    # ── Regression metrics ────────────────────────────────────────────────────
    print("\n=== Regression Metrics ===")
    mae = mean_absolute_error(y_true, y_pred)
    r2  = r2_score(y_true, y_pred)
    rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))
    print(f"  MAE  : {mae:.4f}")
    print(f"  RMSE : {rmse:.4f}")
    print(f"  R²   : {r2:.4f}")

    # Per-bucket regression error
    for label in LABELS:
        mask = np.array([score_to_label(s) == label for s in y_true])
        if mask.sum() > 0:
            bucket_mae = mean_absolute_error(y_true[mask], y_pred[mask])
            print(f"  MAE ({label:8s}): {bucket_mae:.4f}  (n={mask.sum()})")

    # ── Classification report ─────────────────────────────────────────────────
    true_labels = [score_to_label(s) for s in y_true]
    pred_labels = [score_to_label(s) for s in y_pred]

    print("\n=== Classification Report (Weak / Moderate / Strong) ===")
    print(classification_report(true_labels, pred_labels, labels=LABELS, zero_division=0))

    # ── Confusion matrix ──────────────────────────────────────────────────────
    cm = confusion_matrix(true_labels, pred_labels, labels=LABELS)
    print("=== Confusion Matrix (rows=true, cols=predicted) ===")
    header = f"{'':12s}" + "".join(f"{l:>12s}" for l in LABELS)
    print(header)
    for i, row_label in enumerate(LABELS):
        row = f"{row_label:<12s}" + "".join(f"{cm[i, j]:>12d}" for j in range(len(LABELS)))
        print(row)

    # ── Score distribution comparison ─────────────────────────────────────────
    print("\n=== Score Distribution Comparison ===")
    print(f"  True  — mean: {y_true.mean():.2f}, std: {y_true.std():.2f}")
    print(f"  Pred  — mean: {y_pred.mean():.2f}, std: {y_pred.std():.2f}")


if __name__ == "__main__":
    evaluate()
