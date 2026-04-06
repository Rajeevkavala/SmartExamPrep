# SmartExamPrep Frontend UI/UX Upgrade Plan

## Source of Truth
- **Reference HTML:** `smartexamprep-landing-new.html` (1459 lines)
- **Design System:** Dark theme with fire (#e8520a), ice (#00d4ff), cream (#f0e8da) accent colors
- **Typography:** Bebas Neue (display), Instrument Serif (serif), IBM Plex Mono (mono), Outfit (body)

---

## Executive Summary

Complete frontend redesign implementing the premium, dark-themed design language from the landing page HTML across the entire Next.js application. This includes a unified sidebar + top navbar layout, consistent component styling, and pixel-perfect implementation of all pages.

---

## Design System Extraction from HTML

### CSS Variables (from lines 19-29)
```css
--fire: #e8520a;        /* Primary accent - CTAs, highlights */
--fire2: #ff6b1a;       /* Hover state for fire */
--ember: #c43d00;       /* Deep fire accent */
--ice: #00d4ff;         /* Secondary accent - analytics, data */
--ice2: #00a8cc;        /* Ice hover/alt */
--cream: #f0e8da;       /* Light text, headings */
--paper: #0d0d12;       /* Card backgrounds */
--ink: #c2bab0;         /* Body text */
--muted: #5a5550;       /* Secondary text */
--border: #1e1c18;      /* Borders, dividers */
--bg: #06060a;          /* Page background */
--green: #22c55e;       /* Success states */
--amber: #f59e0b;       /* Warning states */
```

### Typography Scale
- **Display (Bebas Neue):** Hero headings, large stats, section titles
- **Serif (Instrument Serif):** Italicized accents, quotes, emphasis
- **Mono (IBM Plex Mono):** Labels, badges, meta text, code
- **Body (Outfit):** Body text, descriptions, UI text

### Spacing & Layout
- Container max-width: 1260px with 48px padding (mobile: 20px)
- Section padding: 120px vertical
- Card padding: 40-44px
- Border radius: Generally 0px (sharp edges) with subtle 2px radius for inputs

---

## Phase 1: Core Layout Architecture

### 1.1 Create App Shell with Sidebar + Navbar

**File:** `frontend/components/layout/AppShell.tsx`

The authenticated app layout with:
- **Collapsible Sidebar (Left)**
  - Logo (SmartExamPrep with fire accent on "EXAM")
  - Navigation items with icons
  - Collapse/expand toggle
  - User profile section at bottom
  
- **Top Navbar**
  - Breadcrumb/page title
  - Search bar (optional)
  - Notifications bell
  - User avatar dropdown
  - Current day/streak indicator

**Sidebar Navigation Items:**
| Icon | Label | Route | Description |
|------|-------|-------|-------------|
| Dashboard | Dashboard | /dashboard | Main overview |
| Map | Roadmap | /roadmap | Week-wise study plan |
| Calendar | Planner | /planner | Daily task management |
| FileQuestion | Quiz | /quiz | Diagnostic & adaptive quizzes |
| Database | PYQ Bank | /pyq | Past year questions |
| RefreshCw | Revision | /revision | Spaced repetition queue |
| MessageSquare | Study Chat | /chat | AI assistant |
| BarChart2 | Analytics | /analytics | Detailed performance |
| Settings | Settings | /settings | User preferences |

### 1.2 Update Student Layout

**File:** `frontend/app/(student)/layout.tsx`

Wrap all student routes with AppShell component:
```tsx
export default function StudentLayout({ children }) {
  return (
    <StudentRouteGuard>
      <AppShell>{children}</AppShell>
    </StudentRouteGuard>
  );
}
```

---

## Phase 2: Design Tokens & Global Styles

### 2.1 Update Tailwind Config

**File:** `frontend/tailwind.config.ts`

Add custom colors, fonts, and animations matching the HTML:

```ts
colors: {
  fire: { DEFAULT: '#e8520a', hover: '#ff6b1a', ember: '#c43d00' },
  ice: { DEFAULT: '#00d4ff', hover: '#00a8cc' },
  cream: '#f0e8da',
  paper: '#0d0d12',
  ink: '#c2bab0',
  muted: '#5a5550',
  border: '#1e1c18',
  bg: '#06060a',
}
fontFamily: {
  display: ['Bebas Neue', 'sans-serif'],
  serif: ['Instrument Serif', 'serif'],
  mono: ['IBM Plex Mono', 'monospace'],
  body: ['Outfit', 'sans-serif'],
}
```

### 2.2 Update Global CSS

**File:** `frontend/app/globals.css`

Add custom properties and base styles:
- Custom scrollbar styling (thin, fire-colored)
- Selection styling (fire background)
- Smooth scroll behavior
- Base typography overrides

### 2.3 Create Animation Utilities

**File:** `frontend/lib/animations.ts`

Implement reveal animations from HTML:
- `rv` - fade up reveal
- `rvl` - fade from left
- `rvr` - fade from right
- `visible` - intersection observer trigger
- Counter animation for stats
- Pulsing animations for live indicators

---

## Phase 3: Landing Page Implementation

### 3.1 Create Landing Page Components

**Directory:** `frontend/components/landing/`

| Component | HTML Section | Description |
|-----------|--------------|-------------|
| `HeroSection.tsx` | #hero (lines 483-585) | Main hero with animated stats, trust badges |
| `ProblemSection.tsx` | #problem (lines 587-614) | "Without vs With" comparison grid |
| `LoopSection.tsx` | #loop (lines 616-715) | Animated learning loop SVG diagram |
| `FeaturesSection.tsx` | #features (lines 717-905) | 5-feature grid with interactive visuals |
| `DashboardPreview.tsx` | #dashboard (lines 907-1008) | Live dashboard mockup |
| `PYQSection.tsx` | #pyq (lines 1010-1093) | PYQ browser with filters |
| `ChatSection.tsx` | #chat (lines 1095-1140) | Study chat preview |
| `TestimonialsSection.tsx` | #testimonials (lines 1142-1181) | User testimonials grid |
| `CompareSection.tsx` | #compare (lines 1184-1217) | Platform vs coaching comparison |
| `PricingSection.tsx` | #pricing (lines 1220-1278) | 3-tier pricing cards |
| `FAQSection.tsx` | #faq (lines 1281-1319) | Accordion FAQ list |
| `CTASection.tsx` | #cta (lines 1321-1336) | Final call-to-action |
| `FooterSection.tsx` | footer (lines 1338-1388) | Site footer with links |
| `Navbar.tsx` | nav (lines 459-481) | Landing page navigation |
| `MobileNav.tsx` | #mnav (lines 450-457) | Mobile navigation overlay |

### 3.2 Update Root Page

**File:** `frontend/app/page.tsx`

Compose all landing page sections:
```tsx
export default function HomePage() {
  return (
    <>
      <Navbar />
      <MobileNav />
      <HeroSection />
      <ProblemSection />
      <LoopSection />
      <FeaturesSection />
      <DashboardPreview />
      <PYQSection />
      <ChatSection />
      <TestimonialsSection />
      <CompareSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <FooterSection />
    </>
  );
}
```

---

## Phase 4: Authentication Pages

### 4.1 Redesign Login/Register Page

**File:** `frontend/app/(auth)/login/page.tsx`

Match the premium dark aesthetic:
- Dark paper background with grain texture
- Centered card with subtle border glow
- Fire-colored primary buttons
- Tab switcher for Login/Register
- Trust indicators below form
- Animated background elements (subtle lines/orbs)

Key elements:
- Logo at top with fire accent
- Input styling matching HTML (border-bottom focus style)
- Mono font for labels
- Error states in red with border highlight
- Loading states with fire-colored spinner

---

## Phase 5: Dashboard Page Redesign

### 5.1 Dashboard Layout

**File:** `frontend/app/(student)/dashboard/page.tsx`

Based on HTML dashboard mockup (lines 907-1008):

**Header Section:**
- Day counter ("Day 21 of 90")
- Exam target badge ("GATE CSE 2026")
- Gradient background with grid pattern

**Primary Metrics Row:**
| Card | Visual | Description |
|------|--------|-------------|
| Readiness Score | Circular gauge | Fire-colored ring, percentage center |
| Study Streak | Day dots | Last 7 days, today pulsing |
| AI Focus Hint | Alert box | Fire border, italic serif text |

**Secondary Metrics Grid:**
| Card | Value | Helper Text |
|------|-------|-------------|
| Roadmap Progress | 38% | "Week 3 of 8 active" |
| Revision Due | 4 | "Topics need review" |
| Questions Today | 12 | "From quiz & tasks" |
| Time Studied | 2.5h | "Today's tracked time" |

**Today's Plan Card:**
- Task list with checkboxes
- Done/Pending states with color coding
- Time estimates per task
- "Open Planner" CTA

**Weakness Detection Card:**
Based on HTML (lines 878-900):
- Progress bars with color gradient (red → amber → green)
- Accuracy percentage, avg time, repeated errors
- AI recommendation at bottom

### 5.2 Create New Dashboard Components

**Files to create:**
- `ReadinessGaugeV2.tsx` - Circular SVG gauge matching HTML
- `StudyStreakCardV2.tsx` - 7-day dot visualization
- `AIFocusHint.tsx` - Bordered hint card
- `TodayPlanCard.tsx` - Task checklist
- `WeaknessProfileCard.tsx` - Multi-bar weakness display
- `DashboardHeader.tsx` - Day counter, exam badge

---

## Phase 6: Roadmap Page Redesign

### 6.1 Roadmap Layout

Based on HTML roadmap visual (lines 761-793):

**Page Structure:**
- Hero section with current week highlight
- Week-by-week timeline (vertical)
- Progress bars per week
- Topic labels with completion status

**Week Card States:**
| State | Visual | Bar Color |
|-------|--------|-----------|
| Done | Green text | Green fill |
| Active | Fire text, pulsing | Fire fill |
| Future | Muted text | Border only |

**Components:**
- `RoadmapHero.tsx` - Current focus, overall progress
- `WeekCard.tsx` - Individual week display
- `TopicList.tsx` - Topics within a week
- `ProgressTimeline.tsx` - Visual timeline connector

---

## Phase 7: Daily Planner Page

### 7.1 Planner Layout

Based on HTML daily planner (lines 808-832):

**Header:**
- "Today — Day 21 of 90"
- Carry-forward banner (if tasks from yesterday)

**Task List:**
- Checkbox with done/pending state
- Task title
- Time indicator (Done / Due now / Later)
- Category badge (Study / PYQ / Revision / Mock)

**Task States:**
| State | Checkbox | Text Style | Time Badge |
|-------|----------|------------|------------|
| Done | Filled green | Strikethrough, muted | "Done" green |
| Due Now | Empty | Normal, cream | "Due now" fire |
| Later | Empty, muted | Muted | Time remaining |

**Components:**
- `PlannerHeader.tsx` - Day info, carry-forward alert
- `TaskCard.tsx` - Individual task item
- `TaskCategoryBadge.tsx` - Task type indicator

---

## Phase 8: Quiz Pages

### 8.1 Quiz Selection Page

Based on HTML diagnostic visual (lines 739-751):

**Quiz Types:**
- Diagnostic Quiz - Fire accent
- Adaptive Quiz - Ice accent
- Mock Test - Cream accent
- PYQ Practice - Mixed

### 8.2 Quiz Taking Interface

**Layout:**
- Progress bar at top (question X of Y)
- Subject/topic badge
- Question text (larger, readable)
- Options list with radio buttons
- Result bar showing subject progress

**Option States:**
| State | Border | Background | Icon |
|-------|--------|------------|------|
| Neutral | Border-only | Transparent | Empty circle |
| Selected | Fire | Fire/10% | Filled circle |
| Correct | Green | Green/5% | Check |
| Wrong | Red | Red/5% | X |

### 8.3 Quiz Result Page

- Score breakdown by subject
- Time analysis
- Weak topics identified
- "Continue to Dashboard" CTA

---

## Phase 9: PYQ Bank Page

### 9.1 PYQ Browser

Based on HTML PYQ section (lines 1021-1070):

**Filter Bar:**
- Year pills (All, 2024, 2023, 2022...)
- Subject pills (OS, Networks, Algorithms, DBMS...)
- Active state: Fire border and text

**Question List:**
- Year badge (left)
- Topic label (fire text)
- Question preview text
- Difficulty tag (Easy/Medium/Hard)
- Pattern tag (e.g., "3rd year in a row")
- Probability percentage (right)

**Stats Panel:**
- Key statistics (78% pattern accuracy, 3x score improvement)
- Total questions count

---

## Phase 10: Revision Queue Page

### 10.1 Revision Layout

Based on HTML SRS visual (lines 222-231):

**Queue List:**
- Topic name
- Last studied info ("3 days ago • Accuracy 42%")
- Due status badge

**Due Status Badges:**
| Status | Color | Border |
|--------|-------|--------|
| Due Now | Fire | Fire/30% |
| Tomorrow | Amber | Amber/30% |
| In X days | Muted | Border |

---

## Phase 11: Study Chat Page

### 11.1 Chat Interface

Based on HTML chat section (lines 1113-1137):

**Layout:**
- Context pill (top) - "Roadmap context active"
- Message list (scrollable)
- Input bar (bottom)

**Message Types:**
- AI messages: Paper background, fire avatar "AI"
- User messages: Fire/6% background, ice avatar "U"

**Features:**
- Highlighted terms (fire color)
- Bold important info
- Suggested follow-up questions

---

## Phase 12: Onboarding Flow

### 12.1 Onboarding Pages

Multi-step onboarding with progress indicator:

1. **Exam Targets** - Select GATE year, target rank
2. **Subject Confidence** - Self-rate each subject
3. **Known Topics** - Mark topics already studied
4. **Study Hours** - Set daily availability
5. **Diagnostic Start** - Begin baseline quiz

**Visual Style:**
- Clean, focused layouts
- Progress dots at top
- Fire CTAs
- Minimal distractions

---

## Phase 13: Shared Components Library

### 13.1 Core UI Components

Update existing components with new design:

| Component | Updates |
|-----------|---------|
| `Button` | Fire primary, ice secondary, ghost variants |
| `Card` | Paper background, border styling |
| `Input` | Bottom-border focus, mono labels |
| `Badge` | Mono font, various color variants |
| `Progress` | Fire/ice gradients |
| `Dialog` | Centered, dark overlay |
| `Toast` | Fire accent, paper background |

### 13.2 New Shared Components

| Component | Purpose |
|-----------|---------|
| `SectionLabel` | Mono uppercase label with line |
| `SectionTitle` | Display font heading |
| `StatCard` | KPI display card |
| `ProgressRing` | Circular progress indicator |
| `StatusBadge` | Due/Done/Pending badges |
| `LiveIndicator` | Pulsing dot for live data |
| `RevealWrapper` | Intersection observer animations |

---

## Phase 14: Responsive Design

### 14.1 Breakpoint Strategy

Based on HTML media queries (lines 426-442):

| Breakpoint | Width | Adjustments |
|------------|-------|-------------|
| Mobile | < 480px | Single column, collapsed sidebar |
| Tablet | < 768px | Container padding 20px |
| Small Desktop | < 900px | Hide desktop nav, show hamburger |
| Desktop | ≥ 900px | Full layout |

### 14.2 Sidebar Behavior

- **Desktop:** Always visible, collapsible to icons
- **Tablet/Mobile:** Hidden by default, slide-in drawer

---

## Phase 15: Animations & Interactions

### 15.1 Page Transitions

- Fade in on route change (via NextTopLoader enhancement)
- Section reveal on scroll (intersection observer)

### 15.2 Micro-interactions

- Button hover effects (slight scale, color shift)
- Card hover (border color change, subtle lift)
- Input focus (underline animation)
- Checkbox toggle (fill animation)
- Progress bar growth (width animation)

### 15.3 Custom Cursor (Optional)

Based on HTML cursor (lines 32-33, 1391-1399):
- Small fire dot following cursor
- Ring that follows with easing
- Expand on hover over interactive elements

---

## Implementation Order (Todos)

### Phase 1: Foundation
- [ ] `setup-design-tokens` - Update Tailwind config with colors, fonts
- [ ] `update-global-css` - Add CSS variables, base styles
- [ ] `create-app-shell` - Build sidebar + navbar layout component
- [ ] `update-student-layout` - Integrate AppShell

### Phase 2: Landing Page
- [ ] `create-landing-navbar` - Responsive navigation
- [ ] `create-hero-section` - Animated hero with stats
- [ ] `create-problem-section` - Comparison grid
- [ ] `create-loop-section` - SVG learning loop
- [ ] `create-features-section` - Feature cards with visuals
- [ ] `create-dashboard-preview` - Mockup component
- [ ] `create-pyq-section` - PYQ browser preview
- [ ] `create-chat-section` - Chat preview
- [ ] `create-testimonials` - User testimonials
- [ ] `create-compare-section` - Platform comparison
- [ ] `create-pricing-section` - Pricing cards
- [ ] `create-faq-section` - Accordion FAQ
- [ ] `create-cta-section` - Final CTA
- [ ] `create-footer` - Site footer
- [ ] `assemble-landing-page` - Compose all sections

### Phase 3: Auth Pages
- [ ] `redesign-login-page` - New login/register UI

### Phase 4: Dashboard
- [ ] `create-dashboard-header` - Day counter, exam badge
- [ ] `create-readiness-gauge-v2` - Circular progress
- [ ] `create-ai-focus-hint` - AI recommendation card
- [ ] `create-today-plan-card` - Task checklist
- [ ] `create-weakness-profile` - Multi-bar display
- [ ] `redesign-dashboard-page` - Assemble new layout

### Phase 5: Feature Pages
- [ ] `redesign-roadmap-page` - Week timeline
- [ ] `redesign-planner-page` - Task management
- [ ] `redesign-quiz-pages` - Quiz flow
- [ ] `redesign-pyq-page` - Question browser
- [ ] `redesign-revision-page` - SRS queue
- [ ] `redesign-chat-page` - AI chat interface
- [ ] `redesign-onboarding-flow` - Multi-step setup

### Phase 6: Polish
- [ ] `add-animations` - Reveal effects, transitions
- [ ] `responsive-testing` - All breakpoints
- [ ] `final-qa` - Cross-browser, accessibility

---

## Files to Create/Modify

### New Files
```
frontend/
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TopNavbar.tsx
│   │   └── MobileDrawer.tsx
│   ├── landing/
│   │   ├── Navbar.tsx
│   │   ├── MobileNav.tsx
│   │   ├── HeroSection.tsx
│   │   ├── ProblemSection.tsx
│   │   ├── LoopSection.tsx
│   │   ├── FeaturesSection.tsx
│   │   ├── DashboardPreview.tsx
│   │   ├── PYQSection.tsx
│   │   ├── ChatSection.tsx
│   │   ├── TestimonialsSection.tsx
│   │   ├── CompareSection.tsx
│   │   ├── PricingSection.tsx
│   │   ├── FAQSection.tsx
│   │   ├── CTASection.tsx
│   │   └── FooterSection.tsx
│   └── shared/
│       ├── SectionLabel.tsx
│       ├── SectionTitle.tsx
│       ├── ProgressRing.tsx
│       ├── StatusBadge.tsx
│       ├── LiveIndicator.tsx
│       └── RevealWrapper.tsx
├── lib/
│   └── animations.ts
└── styles/
    └── custom-cursor.css (optional)
```

### Files to Modify
```
frontend/
├── app/
│   ├── globals.css
│   ├── layout.tsx (add fonts)
│   ├── page.tsx (new landing page)
│   ├── (auth)/login/page.tsx
│   └── (student)/
│       ├── layout.tsx (add AppShell)
│       ├── dashboard/page.tsx
│       ├── roadmap/page.tsx
│       ├── planner/page.tsx
│       ├── quiz/*/page.tsx
│       ├── pyq/page.tsx
│       ├── revision/page.tsx
│       ├── chat/page.tsx
│       └── onboarding/page.tsx
├── tailwind.config.ts
└── components/
    └── ui/*.tsx (style updates)
```

---

## Success Criteria

1. **Visual Consistency:** All pages match the design language from the HTML reference
2. **Responsive:** Works flawlessly on mobile, tablet, and desktop
3. **Performance:** No layout shifts, smooth animations
4. **Accessibility:** Proper contrast, keyboard navigation, screen reader support
5. **Functionality:** All existing features continue to work 100%

---

## Notes

- The HTML file uses custom cursor effects - this is optional but adds polish
- Grain texture overlays are used throughout - can be added via CSS background
- The fire/ice color system creates visual hierarchy - fire for primary actions, ice for data/analytics
- Bebas Neue display font creates strong visual impact - use sparingly for headings
- Mono font (IBM Plex Mono) is used extensively for labels, badges, and metadata
