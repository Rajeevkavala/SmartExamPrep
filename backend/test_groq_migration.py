#!/usr/bin/env python3
"""
Test script to verify Groq migration is working correctly.
Tests all AI workloads and verifies configuration.
"""
import sys
import asyncio
from typing import Any

# Test 1: Configuration
print("=" * 60)
print("TEST 1: Configuration Loading")
print("=" * 60)
try:
    from config import settings
    print("✓ Config module imported successfully")
    
    # Check Groq settings
    if settings.groq_api_key:
        print("✓ Groq API Key: configured")
    else:
        print("✗ Groq API Key: NOT SET")
        
    print(f"✓ Groq Base URL: {settings.groq_base_url}")
    
    # Verify no OpenRouter settings exist
    try:
        _ = settings.openrouter_api_key
        print("✗ WARNING: OpenRouter settings still exist in config!")
    except AttributeError:
        print("✓ OpenRouter settings removed from config")
        
except Exception as e:
    print(f"✗ Config loading failed: {e}")
    sys.exit(1)

# Test 2: AI Types
print("\n" + "=" * 60)
print("TEST 2: AI Types and Enums")
print("=" * 60)
try:
    from ai.types import AIProviderName, AIWorkload
    
    providers = [p.value for p in AIProviderName]
    print(f"✓ Available providers: {providers}")
    
    if "openrouter" in providers:
        print("✗ WARNING: OpenRouter still in AIProviderName enum!")
    else:
        print("✓ OpenRouter removed from AIProviderName enum")
    
    workloads = [w.value for w in AIWorkload]
    print(f"✓ Available workloads ({len(workloads)}): {', '.join(workloads)}")
    
except Exception as e:
    print(f"✗ AI types loading failed: {e}")
    sys.exit(1)

# Test 3: Model Registry
print("\n" + "=" * 60)
print("TEST 3: Model Registry and Workload Profiles")
print("=" * 60)
try:
    from ai.models.model_registry import WORKLOAD_PROFILES, iter_workload_routes
    
    print(f"✓ Loaded {len(WORKLOAD_PROFILES)} workload profiles")
    
    # Check if OpenRouter constants exist
    try:
        from ai.models.model_registry import OPENROUTER_ALLOWED_MODELS
        print("✗ WARNING: OPENROUTER_ALLOWED_MODELS still exists!")
    except ImportError:
        print("✓ OPENROUTER_ALLOWED_MODELS removed")
    
    # Verify all routes use Groq
    print("\nWorkload configurations:")
    for workload, profile in WORKLOAD_PROFILES.items():
        print(f"\n  {workload.value}:")
        print(f"    - Type: {profile.workload_type}")
        print(f"    - Routes: {len(profile.routes)}")
        for i, route in enumerate(profile.routes, 1):
            print(f"      Route {i}: {route.provider.value}/{route.model}")
            print(f"        Timeout: {route.timeout_seconds}s, Retries: {route.max_retries}")
            if route.provider.value != "groq":
                print(f"        ✗ WARNING: Non-Groq provider found!")
    
    # Count unique models
    models = set()
    for _, route in iter_workload_routes():
        models.add(route.model)
    print(f"\n✓ Using {len(models)} unique Groq models: {', '.join(sorted(models))}")
    
except Exception as e:
    print(f"✗ Model registry loading failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 4: AI Providers
print("\n" + "=" * 60)
print("TEST 4: AI Provider Clients")
print("=" * 60)
try:
    from ai.providers import GroqClient
    print("✓ GroqClient imported successfully")
    
    # Try to import OpenRouterClient (should fail)
    try:
        from ai.providers import OpenRouterClient
        print("✗ WARNING: OpenRouterClient still importable!")
    except ImportError:
        print("✓ OpenRouterClient removed from exports")
    
    # Initialize Groq client
    groq = GroqClient()
    print(f"✓ GroqClient initialized")
    print(f"  Configured: {groq.is_configured}")
    
except Exception as e:
    print(f"✗ Provider loading failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 5: AI Router
print("\n" + "=" * 60)
print("TEST 5: AI Router Initialization")
print("=" * 60)
try:
    from ai.services.ai_router import AIRouter
    
    router = AIRouter()
    print("✓ AIRouter initialized successfully")
    
    status = router.provider_status()
    print(f"✓ Provider status: {status}")
    
    # Check for OpenRouter in providers
    if "openrouter" in status:
        print("✗ WARNING: OpenRouter still in provider status!")
    else:
        print("✓ OpenRouter not in provider list")
    
except Exception as e:
    print(f"✗ AI Router initialization failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 6: AI Service Functions
print("\n" + "=" * 60)
print("TEST 6: AI Service Exports")
print("=" * 60)
try:
    from services import ai_service
    
    # Check what's exported
    exports = [name for name in dir(ai_service) if not name.startswith('_')]
    print(f"✓ AI service exports ({len(exports)}):")
    for export in sorted(exports):
        print(f"  - {export}")
    
    # Check for removed functions
    if 'get_openrouter_startup_health' in exports:
        print("✗ WARNING: get_openrouter_startup_health still exported!")
    else:
        print("✓ OpenRouter health check functions removed")
    
except Exception as e:
    print(f"✗ AI service loading failed: {e}")
    import traceback
    traceback.print_exc()

# Test 7: Simple AI Call (if API key is configured)
print("\n" + "=" * 60)
print("TEST 7: Live AI API Call Test")
print("=" * 60)

async def test_ai_call():
    try:
        from ai.services.ai_router import AIRouter
        from ai.types import AIWorkload, AIMessage
        
        router = AIRouter()
        
        if not router._providers[AIProviderName.GROQ].is_configured:
            print("⚠ Skipping live test: Groq API key not configured")
            return
        
        print("Testing live API call with DASHBOARD_FOCUS_HINT workload...")
        
        result = await router.complete_text(
            workload=AIWorkload.DASHBOARD_FOCUS_HINT,
            messages=[AIMessage(role="user", content="Give a brief study tip")],
            temperature=0.7,
            max_tokens=50
        )
        
        if result:
            print(f"✓ Live API call successful!")
            print(f"  Provider: {result.provider.value}")
            print(f"  Model: {result.model}")
            print(f"  Response: {result.content[:100]}...")
        else:
            print("✗ Live API call returned None")
            
    except Exception as e:
        print(f"✗ Live API call failed: {e}")
        import traceback
        traceback.print_exc()

try:
    asyncio.run(test_ai_call())
except Exception as e:
    print(f"✗ Async test failed: {e}")

# Summary
print("\n" + "=" * 60)
print("TEST SUMMARY")
print("=" * 60)
print("All static configuration tests completed.")
print("Review the output above for any ✗ warnings or errors.")
print("\nNext steps:")
print("1. Ensure Groq API key is set in .env")
print("2. Run the backend: uvicorn main:app --reload")
print("3. Test each AI feature through the API:")
print("   - /api/ai/status")
print("   - /api/ai/explain")
print("   - /api/study-chat/*")
print("   - /api/roadmap/*")
print("   - /api/admin/scraper/*")
print("   - /api/admin/syllabus/*")
