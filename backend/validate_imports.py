"""
Quick import validation script - Tests if all modules load correctly after Groq migration
Run this from the backend directory: python validate_imports.py
"""

import sys
import importlib.util

def test_import(module_path: str, description: str) -> bool:
    """Test if a module can be imported"""
    try:
        spec = importlib.util.find_spec(module_path)
        if spec is None:
            print(f"✗ {description}: Module not found")
            return False
        
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        print(f"✓ {description}")
        return True
    except Exception as e:
        print(f"✗ {description}: {str(e)[:100]}")
        return False

print("=" * 70)
print("IMPORT VALIDATION TEST")
print("=" * 70)

results = []

# Core configuration
results.append(test_import("config", "Config module"))

# AI types and enums
results.append(test_import("ai.types", "AI types and enums"))

# AI providers
results.append(test_import("ai.providers", "AI providers module"))
results.append(test_import("ai.providers.groq_client", "Groq client"))
results.append(test_import("ai.providers.base_client", "Base client"))

# AI models and registry
results.append(test_import("ai.models.model_registry", "Model registry"))
results.append(test_import("ai.models.routing_policy", "Routing policy"))

# AI services
results.append(test_import("ai.services.ai_router", "AI router"))
results.append(test_import("ai.services.ai_tasks", "AI tasks"))

# AI validators
results.append(test_import("ai.validators.json_validator", "JSON validator"))
results.append(test_import("ai.validators.response_safety", "Response safety"))

# AI prompts
results.append(test_import("ai.prompts.weak_explanation", "Weakness explanation prompt"))
results.append(test_import("ai.prompts.study_chat", "Study chat prompt"))
results.append(test_import("ai.prompts.dashboard_hint", "Dashboard hint prompt"))
results.append(test_import("ai.prompts.roadmap_enrichment", "Roadmap enrichment prompt"))
results.append(test_import("ai.prompts.scraper_structuring", "Scraper structuring prompt"))
results.append(test_import("ai.prompts.syllabus_parsing", "Syllabus parsing prompt"))
results.append(test_import("ai.prompts.mcq_generation", "MCQ generation prompt"))

# Services
results.append(test_import("services.ai_service", "AI service wrapper"))

# Routers
results.append(test_import("routers.ai", "AI router"))

# Main app
results.append(test_import("main", "Main FastAPI application"))

# Summary
print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
passed = sum(results)
total = len(results)
print(f"Passed: {passed}/{total}")

if passed == total:
    print("\n✅ All imports successful! Groq migration complete.")
    sys.exit(0)
else:
    print(f"\n❌ {total - passed} imports failed. Review errors above.")
    sys.exit(1)
