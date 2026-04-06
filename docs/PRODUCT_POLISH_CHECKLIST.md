# Product Polish Checklist

Do not redesign from scratch. Fix the highest-impact friction points first.

## Priority 1

- Make every async page show an obvious loading state.
- Make empty states instructive, not generic.
- Keep CTA copy specific: “Take Adaptive Quiz”, “Open Revision Plan”, “Share Feedback”.
- Ensure result pages survive refresh.
- Ensure every destructive or failing admin action gives a clear toast or inline error.

## Priority 2

- Add route-level `loading.tsx` and `error.tsx` boundaries where async pages are important.
- Make dashboard cards visually scan faster with fewer competing accents.
- Show one “what should I do next?” block on dashboard.
- Ensure quiz submit button states are unmistakable.
- Add stronger admin success toasts after create, update, delete, verify, import.

## Priority 3

- Tighten copy consistency: “diagnostic quiz” vs “baseline assessment”, “adaptive quiz” vs “AI-recommended quiz”.
- Align empty states across student and admin pages.
- Ensure mobile spacing is comfortable on long admin forms.
- Make revision page explicitly state overdue vs upcoming.

## Page-Specific Review Notes

### Dashboard

- Keep readiness score above the fold.
- Show weak topics and the next recommended action together.
- Use only top 3 weak topics by default.

### Quiz UX

- Make progress always visible.
- Keep submit disabled until the last question has a selected option.
- Preserve answer-selection clarity on mobile.

### Result Page

- Show score, per-topic breakdown, and readiness delta.
- Keep before/after comparisons easy to scan.

### Revision Page

- Distinguish “due now” from “already completed”.
- Add a short explanation of why an item is in today’s plan.

### Admin

- Prioritize clarity over density on content forms.
- Show exact reasons when question validation fails.

## Fastest Wins

1. Result reload reliability
2. Better error copy
3. Better admin toasts
4. Stronger dashboard CTA hierarchy
5. Empty-state cleanup
