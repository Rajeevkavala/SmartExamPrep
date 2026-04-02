# PHASE 9 — ML MODEL TRAINING PIPELINE

> **Goal:** Build the complete offline ML training pipeline in `/ml` — synthetic data generation, feature engineering, model training, evaluation, export, and FastAPI model loading.

---

## 1. `/ml` Folder Structure

```
ml/
├── generate_synthetic_data.py   # Create training data before real users
├── feature_engineering.py       # Extract features from PostgreSQL
├── train_weakness_model.py      # Train XGBoost regressor
├── model_evaluation.py          # Evaluate + cross-validate
├── export_model.py              # Save with joblib
├── requirements.txt             # ML-only dependencies
└── models/
    └── weakness_model.pkl       # Serialized trained model
```

---

## 2. Feature Matrix Definition

```
Features (X):
  - accuracy              : float [0.0, 1.0]   (correct / total for topic)
  - repeated_mistakes     : int   [0, 20+]      (questions wrong 2+ times)
  - avg_response_zscore   : float [-3, +3]      (z-score of response time)
  - recent_slope          : float [-1, +1]      (slope of last 5 scores)
  - difficulty_sensitivity: float [0.0, 1.0]   (hard_error - easy_error rate)

Target (y):
  - weakness_score        : float [0, 100]      (ground truth label)

Label Definition:
  - 0–30  : Strong  (accuracy > 0.75, no pattern of mistakes)
  - 31–60 : Moderate (mixed performance)
  - 61–100: Weak   (accuracy < 0.5, repeated mistakes, declining trend)
```

---

## 3. Synthetic Data Generation (`ml/generate_synthetic_data.py`)

```python
"""
Generate synthetic training data for the WeaknessDetector model.
Used before real user data is collected.
Strategy: sample features from plausible distributions,
          then compute ground-truth labels using the weighted formula.
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
    difficulty_sensitivity: float
) -> float:
    """Ground-truth formula used as target label."""
    score = (
        0.40 * (1 - accuracy) * 100
        + 0.20 * min(repeated_mistakes, 10) * 5
        + 0.10 * max(avg_response_zscore, 0) * 10
        + 0.20 * max(-recent_slope, 0) * 50
        + 0.10 * difficulty_sensitivity * 30
    )
    return float(np.clip(score, 0, 100))

def generate(n_samples: int = 10000) -> pd.DataFrame:
    # Accuracy: Beta distribution (skewed toward moderate)
    accuracy = np.random.beta(a=2, b=2, size=n_samples)

    # Repeated mistakes: Poisson
    repeated_mistakes = np.random.poisson(lam=2, size=n_samples).clip(0, 15)

    # Response time z-score: Normal, centered near 0
    avg_response_zscore = np.random.normal(loc=0.2, scale=1.0, size=n_samples).clip(-3, 3)

    # Recent slope: Normally distributed around 0
    recent_slope = np.random.normal(loc=0, scale=0.3, size=n_samples).clip(-1, 1)

    # Difficulty sensitivity: Beta (most students struggle more on hard)
    difficulty_sensitivity = np.random.beta(a=1.5, b=3, size=n_samples)

    # Compute labels
    labels = [
        compute_weakness_score(acc, rm, rtz, rs, ds)
        for acc, rm, rtz, rs, ds in zip(
            accuracy, repeated_mistakes, avg_response_zscore,
            recent_slope, difficulty_sensitivity
        )
    ]

    df = pd.DataFrame({
        "accuracy": accuracy,
        "repeated_mistakes": repeated_mistakes,
        "avg_response_zscore": avg_response_zscore,
        "recent_slope": recent_slope,
        "difficulty_sensitivity": difficulty_sensitivity,
        "weakness_score": labels
    })

    return df

if __name__ == "__main__":
    df = generate(10000)
    out_path = Path(__file__).parent / "data" / "synthetic_train.csv"
    out_path.parent.mkdir(exist_ok=True)
    df.to_csv(out_path, index=False)
    print(f"✅ Generated {len(df)} samples → {out_path}")
    print(df.describe())
    print("\nWeakness Score Distribution:")
    print(f"  Strong (0-30):   {(df['weakness_score'] <= 30).sum()} samples")
    print(f"  Moderate (31-60): {((df['weakness_score'] > 30) & (df['weakness_score'] <= 60)).sum()} samples")
    print(f"  Weak (61+):      {(df['weakness_score'] > 60).sum()} samples")
```

---

## 4. Training Script (`ml/train_weakness_model.py`)

```python
"""
Train an XGBoost regressor on synthetic (or real) user data.
"""
import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, r2_score
import xgboost as xgb

DATA_PATH = Path(__file__).parent / "data" / "synthetic_train.csv"
MODEL_PATH = Path(__file__).parent / "models" / "weakness_model.pkl"
MODEL_PATH.parent.mkdir(exist_ok=True)

FEATURE_COLS = [
    "accuracy",
    "repeated_mistakes",
    "avg_response_zscore",
    "recent_slope",
    "difficulty_sensitivity"
]

def train():
    print("📊 Loading data...")
    df = pd.read_csv(DATA_PATH)
    X = df[FEATURE_COLS]
    y = df["weakness_score"]

    print(f"   Samples: {len(df)}")
    print(f"   Features: {FEATURE_COLS}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Pipeline: StandardScaler + XGBoost
    model = Pipeline([
        ("scaler", StandardScaler()),
        ("xgb", xgb.XGBRegressor(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            n_jobs=-1
        ))
    ])

    print("\n🚂 Training XGBoost...")
    model.fit(X_train, y_train)

    # Evaluation
    y_pred = model.predict(X_test)
    y_pred_clipped = np.clip(y_pred, 0, 100)

    mae = mean_absolute_error(y_test, y_pred_clipped)
    r2 = r2_score(y_test, y_pred_clipped)

    print(f"\n📈 Test Results:")
    print(f"   MAE: {mae:.2f} points")
    print(f"   R²:  {r2:.4f}")

    # Cross-validation
    cv_scores = cross_val_score(model, X, y, cv=5, scoring="neg_mean_absolute_error")
    print(f"   CV MAE (5-fold): {-cv_scores.mean():.2f} ± {cv_scores.std():.2f}")

    # Feature importance
    xgb_model = model.named_steps["xgb"]
    importances = dict(zip(FEATURE_COLS, xgb_model.feature_importances_))
    print("\n🔍 Feature Importances:")
    for feat, imp in sorted(importances.items(), key=lambda x: -x[1]):
        print(f"   {feat}: {imp:.4f}")

    # Save model
    joblib.dump(model, MODEL_PATH)
    print(f"\n✅ Model saved → {MODEL_PATH}")
    return model

if __name__ == "__main__":
    train()
```

---

## 5. Model Evaluation (`ml/model_evaluation.py`)

```python
"""
Evaluate model accuracy + classification accuracy for Weak/Moderate/Strong labels.
"""
import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from sklearn.metrics import (
    mean_absolute_error, r2_score,
    classification_report, confusion_matrix
)

MODEL_PATH = Path(__file__).parent / "models" / "weakness_model.pkl"
DATA_PATH = Path(__file__).parent / "data" / "synthetic_train.csv"

FEATURE_COLS = [
    "accuracy", "repeated_mistakes", "avg_response_zscore",
    "recent_slope", "difficulty_sensitivity"
]

def label(score: float) -> str:
    if score <= 30: return "Strong"
    elif score <= 60: return "Moderate"
    return "Weak"

def evaluate():
    model = joblib.load(MODEL_PATH)
    df = pd.read_csv(DATA_PATH)

    X = df[FEATURE_COLS]
    y_true = df["weakness_score"]

    y_pred = np.clip(model.predict(X), 0, 100)

    # Regression metrics
    print("=== Regression Metrics ===")
    print(f"MAE:  {mean_absolute_error(y_true, y_pred):.2f}")
    print(f"R²:   {r2_score(y_true, y_pred):.4f}")

    # Classification metrics (within ±5 of true score → correct label)
    true_labels = [label(s) for s in y_true]
    pred_labels = [label(s) for s in y_pred]

    print("\n=== Classification Report (Weak / Moderate / Strong) ===")
    print(classification_report(true_labels, pred_labels))

    print("=== Confusion Matrix ===")
    print(confusion_matrix(true_labels, pred_labels,
                            labels=["Weak", "Moderate", "Strong"]))

if __name__ == "__main__":
    evaluate()
```

---

## 6. Export Script (`ml/export_model.py`)

```python
"""
Export trained model from /ml/models/ to /backend/ml/models/
for use by FastAPI service.
"""
import shutil
from pathlib import Path

SRC = Path(__file__).parent / "models" / "weakness_model.pkl"
DST = Path(__file__).parent.parent / "backend" / "ml" / "models" / "weakness_model.pkl"

def export():
    if not SRC.exists():
        print("❌ Model not found. Run train_weakness_model.py first.")
        return
    DST.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SRC, DST)
    print(f"✅ Model exported: {SRC} → {DST}")

if __name__ == "__main__":
    export()
```

---

## 7. FastAPI Model Loading Pattern (`backend/main.py`)

```python
from contextlib import asynccontextmanager
from ml.weakness_detector import WeaknessDetector
from ml.nlp_pipeline import load_nlp_models

# Singleton ML instances
weakness_detector: WeaknessDetector = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load all ML models at startup, release at shutdown."""
    global weakness_detector

    # Load NLP models (spaCy + sentence-transformer)
    load_nlp_models()
    print("✅ NLP models loaded (spaCy + sentence-transformers)")

    # Load ML model (XGBoost or formula)
    weakness_detector = WeaknessDetector(use_ml_model=True)
    print("✅ WeaknessDetector loaded")

    yield  # App runs here

    # Cleanup (if needed)
    print("🔄 Server shutting down")

app = FastAPI(lifespan=lifespan)
```

### Accessing the detector in services:

```python
# backend/services/weakness_service.py
from main import weakness_detector

def compute_weakness(features):
    return weakness_detector.compute(features)
```

---

## 8. `ml/requirements.txt`

```
xgboost>=2.0.0
scikit-learn>=1.3.0
pandas>=2.0.0
numpy>=1.24.0
joblib>=1.3.0
sentence-transformers>=2.2.2
spacy>=3.7.0
pdfplumber>=0.10.0
```

---

## 9. Full ML Pipeline Summary

```
Offline Training (ml/ folder):
  1. generate_synthetic_data.py → ml/data/synthetic_train.csv
  2. train_weakness_model.py    → ml/models/weakness_model.pkl
  3. model_evaluation.py        → Print metrics + confusion matrix
  4. export_model.py            → Copy to backend/ml/models/

Online Inference (FastAPI startup):
  lifespan() → WeaknessDetector(use_ml_model=True)
             → loads weakness_model.pkl with joblib
             → ready for < 100ms predictions

Per Quiz Submission:
  1. POST /api/quiz/submit
  2. weakness_service.update_topic_mastery()
  3. WeaknessDetector.extract_features_from_db()
  4. detector.compute(features)
  5. TopicMastery.weakness_score updated
  6. SpacedRevisionScheduler.schedule()
  7. RevisionSchedule.due_date updated
```

---

## 10. Performance Target

| Metric | Target |
|---|---|
| Inference latency | < 100ms per topic |
| MAE (weakness score) | < 5 points |
| Label accuracy (Weak/Moderate/Strong) | > 90% |
| NLP tagging latency | < 200ms per question |
| Recommendation latency | < 500ms (10 questions) |

---

## 11. PYQ Image Support Addendum

- ML feature columns remain unchanged, but training/inference data contracts should carry `question_image_urls` for downstream UI and NLP use.
- If OCR/caption text is generated for image-based PYQs, include it in NLP preprocessing before embedding/tag extraction.
- Do not drop image-based questions during dataset prep; treat them as normal records with optional image metadata.
