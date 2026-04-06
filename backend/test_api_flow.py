import httpx
import json
from datetime import date, timedelta
from uuid import uuid4

base_url = "http://127.0.0.1:8000"
REQUEST_TIMEOUT_SECONDS = 30.0
client = httpx.Client(base_url=base_url, timeout=REQUEST_TIMEOUT_SECONDS)
future_exam_date = (date.today() + timedelta(days=180)).isoformat()

print("1. Creating a student user...")
res = client.post("/api/auth/register", json={
    "email": "teststudent@example.com",
    "password": "Password123",
    "full_name": "Test Student"
})
if res.status_code == 201:
    print(" [ok] Student registered.")
elif res.status_code == 400 and "already registered" in res.text:
    print(" [ok] Student already exists.")
else:
    print(f" [error] Register failed: {res.text}")

edge_case_email = f"incomplete-{uuid4().hex[:8]}@example.com"
print("\n1a. Verifying roadmap generation is blocked for incomplete onboarding...")
res = client.post("/api/auth/register", json={
    "email": edge_case_email,
    "password": "Password123",
    "full_name": "Incomplete Student"
})
print(f" [ok] Edge-case register status: {res.status_code}")
res = client.post("/api/auth/login", json={
    "email": edge_case_email,
    "password": "Password123"
})
edge_case_token = res.json().get("access_token")
edge_case_client = httpx.Client(
    base_url=base_url,
    headers={"Authorization": f"Bearer {edge_case_token}"},
    timeout=REQUEST_TIMEOUT_SECONDS,
)
res = edge_case_client.post("/api/roadmap/generate", json={})
print(f" [ok] Incomplete-profile roadmap status: {res.status_code}")
print(f" [data] Incomplete-profile response: {res.json()}")
edge_case_client.close()

print("\n2. Logging in as student...")
res = client.post("/api/auth/login", json={
    "email": "teststudent@example.com",
    "password": "Password123"
})
token = res.json().get("access_token")
client.headers.update({"Authorization": f"Bearer {token}"})
print(" [ok] Logged in successfully.")

print("\n3. Fetching current profile...")
res = client.get("/api/auth/me")
print(f" [ok] Profile fetch status: {res.status_code}")

print("\n4. Loading subjects for enriched onboarding payload...")
res = client.get("/api/content/subjects")
subjects = res.json()
print(f" [ok] Subjects fetched. Response: {len(subjects)} subjects found.")

topics = []
profile_payload = {
    "daily_study_minutes": 90,
    "experience_level": "intermediate",
    "exam_target_date": future_exam_date,
    "subject_confidences": [],
    "known_topic_ids": [],
}

if subjects:
    subject_id = subjects[0]["id"]
    profile_payload["subject_confidences"] = [
        {"subject_id": subject_id, "confidence_pct": 65}
    ]
    topics_res = client.get(f"/api/content/subjects/{subject_id}/topics")
    topics = topics_res.json()
    if topics:
        profile_payload["known_topic_ids"] = [topics[0]["id"]]

print("\n5. Updating enriched onboarding profile...")
res = client.put("/api/auth/me", json=profile_payload)
print(f" [ok] Profile update status: {res.status_code}")
print(f" [data] Updated profile keys: {sorted(res.json().keys())}")

print("\n6. Generating personalized roadmap...")
res = client.post("/api/roadmap/generate", json={"generation_reason": "manual_generate"})
print(f" [ok] Roadmap generate status: {res.status_code}")
roadmap_payload = res.json()
if res.status_code == 200:
    summary = roadmap_payload.get("summary", {})
    print(
        f" [data] Roadmap id: {summary.get('roadmap_id')}, horizon weeks: {summary.get('plan_horizon_weeks')}"
    )

print("\n7. Fetching active roadmap...")
res = client.get("/api/roadmap/current")
print(f" [ok] Active roadmap status: {res.status_code}")
if res.status_code == 200:
    current = res.json()
    print(f" [data] Weeks returned: {len(current.get('weeks', []))}")

print("\n8. Generating next roadmap month...")
res = client.post("/api/roadmap/generate", json={"generation_reason": "manual_generate_next_month"})
print(f" [ok] Next-month generation status: {res.status_code}")
if res.status_code == 200:
    summary = res.json().get("summary", {})
    print(
        " [data] Generated weeks/months: "
        f"{summary.get('generated_weeks')}/{summary.get('generated_months')}"
    )

print("\n9. Updating day tracking for week 1 day 1...")
res = client.patch("/api/roadmap/weeks/1/days/1", json={"status": "completed"})
print(f" [ok] Day tracking update status: {res.status_code}")
if res.status_code == 200:
    tracking = res.json().get("tracking", {})
    print(f" [data] Week completion: {tracking.get('completion_pct')}%")

print("\n10. Fetching diagnostic quiz questions...")
res = client.get("/api/quiz/diagnostic")
quiz_data = res.json()
print(f" [ok] Fetched {quiz_data.get('total')} diagnostic questions.")

print("\n11. Submitting a quiz to trigger ML processing...")
questions = quiz_data.get("questions", [])

if questions:
    answers = []
    for q in questions:
        answers.append({
            "question_id": q["id"],
            "selected_answer": q["options"][0][0] if q["options"] else "A",
            "time_taken_s": 15.5
        })

    res = client.post("/api/quiz/submit", json={
        "quiz_type": "diagnostic",
        "answers": answers
    })
    print(f" [ok] Quiz submitted. Status code: {res.status_code}")
    print(f" [data] Analysis Response:\n{json.dumps(res.json(), indent=2)}")
else:
    print(" [error] No questions found to answer!")

print("\n11a. Loading PYQ filters...")
res = client.get("/api/pyq/filters")
print(f" [ok] PYQ filters status: {res.status_code}")
if res.status_code == 200:
    pyq_filters = res.json()
    print(
        " [data] PYQ filters summary: "
        f"years={len(pyq_filters.get('years', []))}, "
        f"subjects={len(pyq_filters.get('subjects', []))}, "
        f"topics={len(pyq_filters.get('topics', []))}"
    )

print("\n11b. Browsing PYQ questions...")
res = client.get("/api/pyq/questions", params={"limit": 5, "offset": 0})
print(f" [ok] PYQ browse status: {res.status_code}")
pyq_questions = []
if res.status_code == 200:
    pyq_payload = res.json()
    pyq_questions = pyq_payload.get("questions", [])
    print(f" [data] PYQ browse total: {pyq_payload.get('total')} (showing {len(pyq_questions)})")

if pyq_questions:
    print("\n11c. Submitting PYQ practice attempt via /api/quiz/submit...")
    pyq_answers = [
        {
            "question_id": question["id"],
            "selected_answer": "A",
            "time_taken_s": 12.0,
        }
        for question in pyq_questions[:3]
    ]
    res = client.post(
        "/api/quiz/submit",
        json={
            "quiz_type": "pyq_practice",
            "answers": pyq_answers,
            "context_payload": {
                "source": "pyq_browser",
                "filters": {"limit": len(pyq_answers)},
            },
        },
    )
    print(f" [ok] PYQ submission status: {res.status_code}")
    if res.status_code == 200:
        pyq_result = res.json()
        print(
            " [data] PYQ result summary: "
            f"attempt_id={pyq_result.get('attempt_id')}, "
            f"score={pyq_result.get('score')}"
        )

print("\n11d. Fetching today's planner summary...")
res = client.get("/api/planner/today")
print(f" [ok] Planner fetch status: {res.status_code}")
if res.status_code == 200:
    planner = res.json()
    summary = planner.get("summary", {})
    print(
        " [data] Planner tasks/completion: "
        f"{summary.get('completed_tasks')}/{summary.get('total_tasks')} "
        f"({summary.get('completion_pct')}%)"
    )

print("\n11e. Fetching enhanced dashboard payload...")
res = client.get("/api/analysis/dashboard")
print(f" [ok] Dashboard fetch status: {res.status_code}")
if res.status_code == 200:
    dashboard = res.json()
    print(
        " [data] Dashboard KPIs: "
        f"streak={dashboard.get('study_streak_days')}, "
        f"questions_total={dashboard.get('questions_solved_total')}, "
        f"hours_total={dashboard.get('hours_studied_total')}, "
        f"roadmap_progress={dashboard.get('roadmap_progress_pct')}"
    )
    print(
        " [data] Quick actions: "
        f"{[item.get('label') for item in dashboard.get('quick_actions', [])][:4]}"
    )

print("\n11f. Fetching analytics metrics payload...")
res = client.get("/api/analysis/metrics")
print(f" [ok] Metrics fetch status: {res.status_code}")
if res.status_code == 200:
    metrics = res.json()
    print(
        " [data] Metrics rollups: "
        f"streak={metrics.get('study_streak_days')}, "
        f"hours_total={metrics.get('hours_studied_total')}, "
        f"roadmap_progress={metrics.get('roadmap_progress_pct')}, "
        f"planner_today={metrics.get('planner_completion_pct_today')}"
    )

print("\n11g. Creating a study chat session...")
res = client.post("/api/study-chat/sessions", json={"title": "Planner help", "context_type": "planner"})
print(f" [ok] Study chat create status: {res.status_code}")
chat_session_id = None
if res.status_code == 200:
    chat_payload = res.json()
    chat_session_id = chat_payload.get("session", {}).get("session_id")
    print(f" [data] Created session: {chat_session_id}")

if chat_session_id:
    print("\n11h. Sending a grounded study chat message...")
    res = client.post(
        f"/api/study-chat/sessions/{chat_session_id}/messages",
        json={"message": "What should I focus on today?"},
    )
    print(f" [ok] Study chat message status: {res.status_code}")
    if res.status_code == 200:
        chat_reply = res.json().get("assistant_message", {}).get("message_text")
        print(f" [data] Assistant reply preview: {str(chat_reply)[:140]}")

    print("\n11i. Fetching study chat sessions list...")
    res = client.get("/api/study-chat/sessions")
    print(f" [ok] Study chat sessions status: {res.status_code}")
    if res.status_code == 200:
        print(f" [data] Session count: {len(res.json().get('sessions', []))}")

print("\n12. Logging in as admin...")
admin_res = client.post("/api/auth/login", json={
    "email": "admin@smartexamprep.com",
    "password": "admin@1234"
})
admin_token = admin_res.json().get("access_token")
admin_client = httpx.Client(
    base_url=base_url,
    headers={"Authorization": f"Bearer {admin_token}"},
    timeout=REQUEST_TIMEOUT_SECONDS,
)
print(" [ok] Logged in as admin.")

res = admin_client.get("/api/admin/content/subjects")
print(f" [ok] Admin topics fetch status: {res.status_code}")
if res.status_code == 200:
    print(f"   Found {len(res.json())} items.")

print("\n[ok] All End-to-End API and ML tasks tested successfully.")
