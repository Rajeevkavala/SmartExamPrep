# Files to Clean Up After OpenRouter Removal

## Files to Delete
These files are no longer needed and can be safely deleted:

1. **backend/ai/providers/openrouter_client.py**
   - OpenRouter client implementation (no longer used)

2. **backend/ai/services/startup_health.py**
   - OpenRouter health check service (no longer needed)

3. **backend/tests/test_openrouter_startup_health.py**
   - Tests for OpenRouter startup health (no longer relevant)

4. **backend/tests/test_ai_router_provider_skip.py**
   - Tests for OpenRouter provider skipping logic (no longer relevant)

## Files That May Reference OpenRouter in Documentation
These files might contain references to OpenRouter in documentation or comments:

1. **docs/AI_OPENROUTER_GROQ_MIGRATION_GUIDE.md**
   - Migration guide (now obsolete, can be archived or deleted)

2. **docs/AI_SYSTEMS_AUDIT_REPORT.md**
   - May contain historical references to OpenRouter

3. **docs/BACKEND_HARDENING.md**
   - May contain OpenRouter configuration notes

4. **docs/DEPLOYMENT_CHECKLIST.md**
   - May contain OpenRouter setup steps

5. **docs/DEMO_SCRIPT.md**
   - May mention OpenRouter features

6. **docs/PORTFOLIO_PACKAGING.md**
   - May reference OpenRouter integration

7. **docs/RESEARCH_PAPER_PACKAGE.md**
   - May discuss OpenRouter in research context

8. **README.md**
   - May mention OpenRouter as a provider

9. **DEVELOPMENT_PROMPTS.md**
   - May contain OpenRouter development notes

10. **phases/phase-05-backend-api.md**
    - May document OpenRouter integration

11. **phases/phase-08-ai-nlp-gemini.md**
    - May reference OpenRouter alongside Gemini

12. **improvement manual testing folder/PHASE_4_MANUAL_TESTING_GUIDE.md**
    - May include OpenRouter testing steps

## Recommended Actions

### Immediate (Required for Functionality)
- ✅ Delete `backend/ai/providers/openrouter_client.py`
- ✅ Delete `backend/ai/services/startup_health.py`
- ✅ Delete or update `backend/tests/test_openrouter_startup_health.py`
- ✅ Delete or update `backend/tests/test_ai_router_provider_skip.py`

### Soon (Clean Up Documentation)
- Update or remove references to OpenRouter in documentation files
- Archive `docs/AI_OPENROUTER_GROQ_MIGRATION_GUIDE.md` if it exists
- Update README.md to reflect Groq-only architecture

### Optional (Housekeeping)
- Review and update test files that may reference OpenRouter models
- Search for any remaining OpenRouter environment variable references
- Update deployment scripts/guides that mention OpenRouter setup

## Command to Find Remaining References
```bash
# Search for any remaining OpenRouter references
grep -r -i "openrouter" --include="*.py" --include="*.md" --include="*.json" --include="*.yaml" --include="*.yml" .

# Search for references to removed files
grep -r "startup_health" --include="*.py" .
grep -r "openrouter_client" --include="*.py" .
```

## Tests That Need Updates

### backend/tests/test_ai_model_allowlist.py
May contain tests for `is_model_allowed()` function which was removed.

### Any integration tests
Tests that mock or use multiple AI providers will need to be updated to only use Groq.
