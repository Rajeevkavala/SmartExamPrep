"""
Train an XGBoost regressor on synthetic (or real) user data.

Run:
    python ml/train_weakness_model.py

Pipeline: StandardScaler → XGBRegressor
Outputs:  ml/models/weakness_model.pkl
"""
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, r2_score
import xgboost as xgb

DATA_PATH  = Path(__file__).parent / "data"   / "synthetic_train.csv"
MODEL_PATH = Path(__file__).parent / "models" / "weakness_model.pkl"
MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)

FEATURE_COLS = [
    "accuracy",
    "repeated_mistakes",
    "avg_response_zscore",
    "recent_slope",
    "difficulty_sensitivity",
]
TARGET_COL = "weakness_score"


def train() -> Pipeline:
    # ── 1. Load data ──────────────────────────────────────────────────────────
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Training data not found at {DATA_PATH}.\n"
            "Run  python ml/generate_synthetic_data.py  first."
        )

    print("📊 Loading data...")
    df = pd.read_csv(DATA_PATH)
    X  = df[FEATURE_COLS]
    y  = df[TARGET_COL]
    print(f"   Samples  : {len(df)}")
    print(f"   Features : {FEATURE_COLS}")
    print(f"   Target   : mean={y.mean():.2f}, std={y.std():.2f}")

    # ── 2. Train / test split ─────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X.values, y.values, test_size=0.20, random_state=42
    )

    # ── 3. Build pipeline ─────────────────────────────────────────────────────
    model = Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "xgb",
                xgb.XGBRegressor(
                    n_estimators=200,
                    max_depth=6,
                    learning_rate=0.05,
                    subsample=0.8,
                    colsample_bytree=0.8,
                    random_state=42,
                    n_jobs=-1,
                    verbosity=0,
                ),
            ),
        ]
    )

    # ── 4. Train ──────────────────────────────────────────────────────────────
    print("\n🚂 Training XGBoost...")
    model.fit(X_train, y_train)

    # ── 5. Evaluate on held-out test set ──────────────────────────────────────
    y_pred         = model.predict(X_test)
    y_pred_clipped = np.clip(y_pred, 0, 100)

    mae = mean_absolute_error(y_test, y_pred_clipped)
    r2  = r2_score(y_test, y_pred_clipped)

    print(f"\n📈 Test Results:")
    print(f"   MAE : {mae:.4f} points")
    print(f"   R²  : {r2:.4f}")

    # ── 6. 5-fold cross-validation ───────────────────────────────────────────
    cv_scores = cross_val_score(
        model, X.values, y.values, cv=5, scoring="neg_mean_absolute_error", n_jobs=-1
    )
    print(f"   CV MAE (5-fold): {-cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # ── 7. Feature importances (from the XGB step) ───────────────────────────
    xgb_step   = model.named_steps["xgb"]
    importances = dict(zip(FEATURE_COLS, xgb_step.feature_importances_))
    print("\n🔍 Feature Importances:")
    for feat, imp in sorted(importances.items(), key=lambda x: -x[1]):
        bar = "█" * int(imp * 40)
        print(f"   {feat:<30s}: {imp:.4f}  {bar}")

    # ── 8. Save model ─────────────────────────────────────────────────────────
    joblib.dump(model, MODEL_PATH)
    print(f"\n✅ Model saved → {MODEL_PATH}")

    return model


if __name__ == "__main__":
    trained_model = train()
