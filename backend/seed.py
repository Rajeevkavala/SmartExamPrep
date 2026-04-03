"""
Database Seed Script for SmartExamPrep MVP.

Actions (in order):
  1. DROP all tables and re-create them (clean slate)
  2. Create admin user  admin@smartexamprep.com / admin@1234
  3. Insert all 11 subjects + topics from seed_data/subjects.json
  4. Insert 3 sample questions from seed_data/questions.json

Run from the backend/ directory:
    python seed.py

Requirements: DATABASE_URL set in ../.env or .env
"""
import json
import sys
from pathlib import Path

# ── Make sure backend/ is on sys.path when run directly ──────────────────────
BACKEND_DIR = Path(__file__).parent
sys.path.insert(0, str(BACKEND_DIR))

from database import engine, SessionLocal
from models.models import (
    Base,
    DifficultyEnum,
    Question,
    RoleEnum,
    SourceTypeEnum,
    Subject,
    Topic,
    User,
)
from services.auth_service import hash_password


SEED_DATA_DIR = BACKEND_DIR / "seed_data"

ADMIN_EMAIL    = "admin@smartexamprep.com"
ADMIN_PASSWORD = "admin@1234"
ADMIN_NAME     = "Platform Admin"


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def load_json(filename: str) -> dict:
    path = SEED_DATA_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Seed file not found: {path}")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _difficulty(raw: str) -> DifficultyEnum:
    mapping = {
        "easy":   DifficultyEnum.easy,
        "medium": DifficultyEnum.medium,
        "hard":   DifficultyEnum.hard,
    }
    val = raw.strip().lower()
    if val not in mapping:
        raise ValueError(f"Unknown difficulty '{raw}'. Expected one of: easy, medium, hard")
    return mapping[val]


def _source_type(raw: str) -> SourceTypeEnum:
    mapping = {
        "pyq":      SourceTypeEnum.PYQ,
        "practice": SourceTypeEnum.practice,
        "scraped":  SourceTypeEnum.scraped,
    }
    val = raw.strip().lower()
    if val not in mapping:
        raise ValueError(f"Unknown source_type '{raw}'.")
    return mapping[val]


# ─────────────────────────────────────────────────────────────────────────────
# Main seed function
# ─────────────────────────────────────────────────────────────────────────────

def seed_db() -> None:
    print("=" * 60)
    print("🗑️  Step 1: Dropping all existing tables (clean slate)...")
    print("=" * 60)

    # Drop all tables in the correct dependency order
    Base.metadata.drop_all(bind=engine)
    print("   ✅ All tables dropped.")

    print("\n🏗️  Step 2: Re-creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("   ✅ All tables created.")

    db = SessionLocal()
    try:
        # ── Admin user ────────────────────────────────────────────────────────
        print(f"\n👤 Step 3: Creating admin user ({ADMIN_EMAIL})...")
        admin = User(
            email=ADMIN_EMAIL,
            hashed_password=hash_password(ADMIN_PASSWORD),
            full_name=ADMIN_NAME,
            role=RoleEnum.admin,
            is_active=True,
        )
        db.add(admin)
        db.flush()  # get admin.id
        print(f"   ✅ Admin created — id: {admin.id}")

        # ── Subjects & Topics ────────────────────────────────────────────────
        print("\n📚 Step 4: Inserting subjects + topics...")
        subjects_data = load_json("subjects.json")
        subject_count = 0
        topic_count   = 0

        for order_s, subj_data in enumerate(subjects_data["subjects"]):
            subject = Subject(
                name=subj_data["name"],
                display_order=order_s,
            )
            db.add(subject)
            db.flush()
            subject_count += 1

            for order_t, topic_data in enumerate(subj_data["topics"]):
                topic = Topic(
                    subject_id=subject.id,
                    name=topic_data["name"],
                    subtopics=topic_data.get("subtopics", []),
                    nlp_keyword_tags=topic_data.get("nlp_tags", []),
                    display_order=order_t,
                )
                db.add(topic)
                topic_count += 1

            print(f"   📖 {subj_data['name']}  ({len(subj_data['topics'])} topics)")

        db.flush()
        print(f"\n   ✅ Inserted {subject_count} subjects, {topic_count} topics.")

        # ── Sample Questions ─────────────────────────────────────────────────
        print("\n❓ Step 5: Inserting sample questions...")
        questions_data = load_json("questions.json")
        q_count = 0

        for q in questions_data["questions"]:
            subject = (
                db.query(Subject)
                .filter(Subject.name == q["subject"])
                .first()
            )
            if not subject:
                print(f"   ⚠️  Subject '{q['subject']}' not found — skipping question.")
                continue

            topic = (
                db.query(Topic)
                .filter(Topic.subject_id == subject.id, Topic.name == q["topic"])
                .first()
            )
            if not topic:
                print(f"   ⚠️  Topic '{q['topic']}' not found in '{q['subject']}' — skipping.")
                continue

            question = Question(
                subject_id=subject.id,
                topic_id=topic.id,
                subtopic=q.get("subtopic"),
                question_text=q["question_text"],
                options=q["options"],
                question_image_urls=q.get("question_image_urls", []),
                correct_answer=q["correct_answer"],
                explanation=q.get("explanation"),
                difficulty=_difficulty(q["difficulty"]),
                source_type=_source_type(q["source_type"]),
                year=q.get("year"),
                nlp_keyword_tags=q.get("nlp_tags", []),
                is_verified=True,
                created_by=admin.id,
            )
            db.add(question)
            q_count += 1
            print(f"   ✅ Q{q_count}: [{q['difficulty'].upper()}] {q['question_text'][:60]}...")

        db.commit()

        # ── Summary ───────────────────────────────────────────────────────────
        print("\n" + "=" * 60)
        print("🎉 SEED COMPLETE")
        print("=" * 60)
        print(f"  Admin user   : {ADMIN_EMAIL}  /  {ADMIN_PASSWORD}")
        print(f"  Subjects     : {subject_count}")
        print(f"  Topics       : {topic_count}")
        print(f"  Questions    : {q_count}")
        print("=" * 60)

    except Exception as exc:
        db.rollback()
        print(f"\n❌ Seed FAILED: {exc}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_db()
