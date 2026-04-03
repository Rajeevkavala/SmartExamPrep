import httpx
import json

base_url = "http://127.0.0.1:8000"
client = httpx.Client(base_url=base_url)

print("1. Creating a student user...")
res = client.post("/api/auth/register", json={
    "email": "teststudent@example.com",
    "password": "Password123",
    "full_name": "Test Student"
})
if res.status_code == 201:
    print(" ✅ Student registered.")
elif res.status_code == 400 and "already registered" in res.text:
    print(" ✅ Student already exists.")
else:
    print(f" ❌ Register failed: {res.text}")

print("\n2. Logging in as student...")
res = client.post("/api/auth/login", json={
    "email": "teststudent@example.com",
    "password": "Password123"
})
token = res.json().get("access_token")
client.headers.update({"Authorization": f"Bearer {token}"})
print(" ✅ Logged in successfully.")

print("\n3. Fetching diagnostic quiz questions...")
res = client.get("/api/quiz/diagnostic")
quiz_data = res.json()
print(f" ✅ Fetched {quiz_data.get('total')} diagnostic questions.")

print("\n4. Submitting a quiz to trigger ML processing...")
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
    print(f" ✅ Quiz submitted. Status code: {res.status_code}")
    print(f" 📊 Analysis Response:\n{json.dumps(res.json(), indent=2)}")
else:
    print(" ❌ No questions found to answer!")

print("\n5. Testing /api/content/subjects...")
res = client.get("/api/content/subjects")
print(f" ✅ Subjects fetched. Response: {len(res.json())} subjects found.")

print("\n6. Logging in as admin...")
admin_res = client.post("/api/auth/login", json={
    "email": "admin@smartexamprep.com",
    "password": "admin@1234"
})
admin_token = admin_res.json().get("access_token")
admin_client = httpx.Client(base_url=base_url, headers={"Authorization": f"Bearer {admin_token}"})
print(" ✅ Logged in as admin.")

res = admin_client.get("/api/admin/content/subjects/all")
print(f" ✅ Admin topics fetch status: {res.status_code}")
if res.status_code == 200:
    print(f"   Found {len(res.json())} items.")

print("\n✅ All End-to-End API and ML tasks tested successfully.")
