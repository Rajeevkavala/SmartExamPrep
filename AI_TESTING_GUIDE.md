# AI Features Testing Guide - Post Groq Migration

## Quick Start

### 1. Run Configuration Test
```bash
cd backend
python test_groq_migration.py
```

This will verify:
- ✅ Configuration loads correctly
- ✅ OpenRouter removed from all code
- ✅ All workloads configured with Groq models
- ✅ AI router initializes properly

### 2. Start Backend
```bash
cd backend
uvicorn main:app --reload --port 8000
```

Watch for startup messages:
- `[ok] AI providers: groq=on`
- `[ok] Configured workloads: weakness_explanation, dashboard_focus_hint, ...`

### 3. Run Endpoint Tests
```bash
cd backend
python test_ai_endpoints.py
```

## Manual Testing Checklist

### Feature 1: Weakness Explanation
**Model:** `llama-3.1-8b-instant`  
**Workload:** `WEAKNESS_EXPLANATION`

1. Login as student
2. Take a quiz (get some questions wrong)
3. Go to Dashboard → Weaknesses section
4. Click "Explain" button on a weak topic
5. **Expected:** AI-generated explanation appears
6. **Verify in logs:** 
   - `AI text attempt failed` should NOT appear
   - Should see Groq API call

**API Test:**
```bash
curl -X POST http://localhost:8000/api/ai/explain \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"topic_id": "TOPIC_ID_HERE"}'
```

---

### Feature 2: Dashboard Focus Hint
**Model:** `llama-3.1-8b-instant`  
**Workload:** `DASHBOARD_FOCUS_HINT`

1. Login as student
2. Navigate to Dashboard
3. **Expected:** See "Today's Focus" hint card
4. **Verify:** Hint is personalized and relevant
5. **Check cache:** Second load should be instant (cached for 30 min)

**Note:** This is triggered automatically by dashboard service

---

### Feature 3: Study Chat
**Model:** `llama-3.3-70b-versatile`  
**Workload:** `STUDY_CHAT`

1. Login as student
2. Go to Study Chat page
3. Start a new chat session
4. Ask a study-related question
5. **Expected:** Contextual, grounded response
6. **Verify:** Response time < 10 seconds
7. Test follow-up questions

**Example prompts:**
- "Explain photosynthesis"
- "What are Newton's laws of motion?"
- "Help me understand quadratic equations"

---

### Feature 4: Roadmap Generation with Month Enrichment
**Model:** `llama-3.3-70b-versatile`  
**Workload:** `ROADMAP_MONTH_ENRICHMENT`

1. Login as student
2. Go to Roadmap page
3. Create new roadmap (select exam date, subjects)
4. **Expected:** Roadmap generated with enriched monthly goals
5. **Verify:** Each month has AI-generated tips and milestones
6. **Check cache:** Regenerating same roadmap should use cache (24 hr TTL)

**Note:** Look for structured JSON responses with study tips and resource suggestions

---

### Feature 5: Content Scraping & Classification
**Model:** `llama-3.3-70b-versatile`  
**Workload:** `SCRAPER_STRUCTURING`

1. Login as admin
2. Go to Admin → Content Scraper
3. Create new scrape job with URL
4. Wait for scraping to complete
5. Click "Classify Questions"
6. **Expected:** AI extracts and structures questions
7. **Verify:** Questions have proper format, options, answers

**API Test:**
```bash
curl -X POST http://localhost:8000/api/admin/scraper/jobs/JOB_ID/classify \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

### Feature 6: Syllabus Parsing
**Model:** `llama-3.3-70b-versatile`  
**Workload:** `SYLLABUS_PARSING`

1. Login as admin
2. Go to Admin → Syllabus Management
3. Upload a syllabus PDF or paste text
4. Click "Parse Syllabus"
5. **Expected:** Hierarchical structure (subjects → topics → subtopics)
6. **Verify:** Extraction is accurate and well-organized

**Sample syllabus text:**
```
Mathematics Syllabus
1. Algebra
   - Linear Equations
   - Quadratic Equations
2. Geometry
   - Triangles
   - Circles
```

---

### Feature 7: MCQ Generation from Study Material
**Model:** `llama-3.3-70b-versatile`  
**Workload:** `MCQ_GENERATION`

1. Login as student
2. Go to Upload Study Material page
3. Upload a document or paste text
4. Request MCQ generation (specify quantity)
5. **Expected:** Multiple choice questions generated
6. **Verify:** Questions are relevant, have 4 options, correct answers marked

**Test with sample text:**
```
Photosynthesis is the process by which plants convert light energy 
into chemical energy. It occurs in chloroplasts using chlorophyll.
The equation is: 6CO2 + 6H2O + light → C6H12O6 + 6O2
```

---

## Monitoring & Verification

### 1. Check Backend Logs
Look for these patterns:
```
✓ Good: "AI text attempt failed for ... via groq/llama-3.1-8b-instant"
✗ Bad:  "AI text attempt failed for ... via openrouter/..."
✓ Good: "All AI text routes failed" (only after Groq retries)
```

### 2. Verify API Response Structure
All AI responses should include:
```json
{
  "content": "...",
  "provider": "groq",
  "model": "llama-3.1-8b-instant" or "llama-3.3-70b-versatile"
}
```

### 3. Check Groq Dashboard
- Login to Groq console: https://console.groq.com
- Check API usage statistics
- Verify models being used:
  - `llama-3.1-8b-instant` for fast operations
  - `llama-3.3-70b-versatile` for complex operations

### 4. Performance Expectations

| Feature | Model | Expected Response Time | Max Retries |
|---------|-------|----------------------|-------------|
| Weakness Explanation | llama-3.1-8b-instant | < 6s | 2 |
| Dashboard Hint | llama-3.1-8b-instant | < 4s | 2 |
| Study Chat | llama-3.3-70b-versatile | < 10s | 2 |
| Roadmap Enrichment | llama-3.3-70b-versatile | < 14s | 2 |
| Scraper Structuring | llama-3.3-70b-versatile | < 10s | 2 |
| Syllabus Parsing | llama-3.3-70b-versatile | < 12s | 2 |
| MCQ Generation | llama-3.3-70b-versatile | < 16s | 2 |

## Troubleshooting

### Issue: "All AI routes failed"
**Cause:** Groq API key invalid or network issue  
**Fix:** 
1. Check .env file has correct GROQ_API_KEY
2. Test API key: `curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer YOUR_KEY"`
3. Check network connectivity

### Issue: Slow responses
**Cause:** Model selection or network latency  
**Fix:**
1. Verify correct model is being used (check logs)
2. Consider adjusting timeout values in model_registry.py
3. Check Groq service status

### Issue: Structured output errors
**Cause:** Model not following JSON schema  
**Fix:**
1. Verify structured_mode=STRICT is set for complex workloads
2. Check prompt engineering in ai/prompts/
3. Increase max_tokens if output is truncated

### Issue: Features not using AI
**Cause:** workload configuration issue  
**Fix:**
1. Run `python test_groq_migration.py` to verify setup
2. Check model_registry.py for correct workload mapping
3. Verify should_use_llm=True for all workloads

## Success Criteria

✅ All 7 AI features work without errors  
✅ No OpenRouter references in logs  
✅ Response times within expected ranges  
✅ Groq dashboard shows API usage  
✅ Caching works for appropriate workloads  
✅ Structured outputs are valid JSON  
✅ Error handling works (retries, fallbacks)  

## Test Data Setup (Optional)

If you need to create test data:

```sql
-- Create test student user
INSERT INTO users (id, email, password_hash, role, name) 
VALUES (
  'test-student-001', 
  'student@test.com', 
  '$2b$12$...', -- bcrypt hash of 'password123'
  'student',
  'Test Student'
);

-- Create test subject and topics
INSERT INTO subjects (id, name) VALUES ('math-101', 'Mathematics');
INSERT INTO topics (id, name, subject_id) VALUES 
  ('topic-1', 'Algebra', 'math-101'),
  ('topic-2', 'Geometry', 'math-101');

-- Create test exam
INSERT INTO exams (id, name, date) VALUES 
  ('exam-001', 'Mid-term Math', '2026-05-01');
```

## Automated Testing Script

For continuous testing, create a cron job:

```bash
#!/bin/bash
# test_ai_health.sh

echo "Testing AI features health..."
python backend/test_groq_migration.py > /tmp/ai_test_$(date +%Y%m%d_%H%M%S).log

if [ $? -eq 0 ]; then
    echo "✓ All tests passed"
else
    echo "✗ Tests failed, check logs"
    exit 1
fi
```

Run daily:
```bash
chmod +x test_ai_health.sh
crontab -e
# Add: 0 9 * * * /path/to/test_ai_health.sh
```
