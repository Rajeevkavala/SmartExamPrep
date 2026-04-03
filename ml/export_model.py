"""
Export trained model from /ml/models/ → /backend/ml/models/
so the FastAPI service can load it at startup.

Run: python ml/export_model.py
"""
import shutil
from pathlib import Path

SRC = Path(__file__).parent / "models" / "weakness_model.pkl"
DST = Path(__file__).parent.parent / "backend" / "ml" / "models" / "weakness_model.pkl"


def export() -> None:
    if not SRC.exists():
        print(f"❌ Source model not found: {SRC}")
        print("   Run  python ml/train_weakness_model.py  first.")
        return

    DST.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SRC, DST)

    src_size = SRC.stat().st_size / 1024
    print(f"✅ Model exported successfully")
    print(f"   Source : {SRC}  ({src_size:.1f} KB)")
    print(f"   Dest   : {DST}")
    print(f"   FastAPI will load this on next startup via WeaknessDetector(use_ml_model=True)")


if __name__ == "__main__":
    export()
