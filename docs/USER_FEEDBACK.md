# User Feedback System

SmartExamPrep now has a lightweight feedback loop intended for product polishing and research support.

## Implemented Pieces

- Student feedback page: `/feedback`
- Submit API: `POST /api/feedback`
- Student history API: `GET /api/feedback/me`
- Admin review API: `GET /api/feedback/admin/recent`

## Feedback Questions

Students rate 1 to 5 on:

- usefulness of weakness analysis
- usefulness of recommendations
- usefulness of revision scheduling
- UI clarity
- overall usefulness

Students also submit:

- context page
- free-text comment

## Why This Design Works For A Solo Developer

- No complex survey platform is required.
- Ratings are structured enough for charts and averages.
- Comments give you qualitative product insights.
- It works inside the existing app and auth system.

## Recommended Usage Points

- After first diagnostic result
- After one adaptive quiz
- After first revision completion
- At the end of a 1-week evaluation period

## How To Use Feedback In Evaluation

- Compare `overall_rating` against objective improvement metrics.
- Compare `weakness_analysis_rating` against topic recovery.
- Compare `revision_rating` against revision compliance.
- Tag comments by theme:
  - helpful explanation
  - inaccurate weakness detection
  - repetitive recommendation
  - confusing dashboard
  - revision reminders useful

## Practical Analysis Table

| Metric | Example Use |
| --- | --- |
| Avg overall usefulness | portfolio and README summary |
| Avg weakness analysis rating | validates whether the diagnosis feels believable |
| Avg revision rating | supports spaced-revision usefulness claim |
| Top complaint theme | product polish roadmap |
| Top praised theme | highlight in demo and portfolio |

## Recommended Next Step

- Add a small admin feedback review page later if you want in-product moderation and export.
