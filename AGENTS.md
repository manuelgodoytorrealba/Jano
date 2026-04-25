# JANO — Agent Operating Guide

## Product Identity

JANO is a premium platform for art discovery, connected knowledge, and editorial curation.

It is not just a CRUD app.

Core pillars:
- visual exploration
- cultural discovery
- graph relationships
- editorial storytelling
- collections
- intelligent recommendations
- premium admin tooling

Every change should reinforce product quality, clarity, and long-term value.

---

# Core Stack

- Frontend: Angular
- Backend: NestJS
- ORM: Prisma
- Database: PostgreSQL
- Environment: Linux / macOS hybrid workflow

---

# Decision Priorities

When tradeoffs exist, prioritize in this order:

1. Truth of the system
2. Stability
3. UX clarity
4. Clean architecture
5. Premium feel
6. Speed of iteration

---

# Source of Truth Rule

Backend owns business logic.

Frontend should:
- render state
- manage local UI state
- provide interactions
- preview drafts

Frontend must not duplicate critical backend resolution logic unless explicitly requested.

Avoid dual-truth systems.

---

# Product Thinking Rules

Before changing code, identify which layer the problem belongs to:

- Logic problem → fix backend/domain rules first
- UX confusion → improve language, hierarchy, feedback
- Visual weakness → improve UI polish
- Complexity problem → refactor structure
- Performance issue → optimize bottlenecks

Do not mask architectural issues with cosmetic UI changes.

---

# UI Principles

JANO UI should feel premium, calm, intelligent, and editorial.

Prefer:
- strong hierarchy
- elegant spacing
- minimal noise
- smooth interactions
- readable density
- polished states
- purposeful motion
- responsive layouts
- refined dark/light surfaces

Avoid:
- clutter
- generic admin feeling
- cramped layouts
- random colors
- excessive borders
- visual noise
- gimmicky effects

Glass effects are optional, never mandatory.

Clarity beats decoration.

---

# Admin Experience Principles

The admin is a professional tool, not a raw internal panel.

It should feel:
- modular
- focused
- trustworthy
- efficient
- visually refined

Editors should always understand:
- what is active
- what changed
- what is saved
- what needs attention
- what happens next

---

# Media System Principles

Media in JANO is editorial infrastructure.

Respect these concepts:
- slot intent
- resolved output
- draft vs persisted
- quality signals
- visual context
- fallback only when meaningful

WYSIWYG principle:
If adjusted in admin, it should match the public product.

Avoid hidden automatic behavior.

---

# Frontend Principles

- Prefer maintainable Angular patterns
- Keep templates readable
- Split oversized components
- Use reusable UI pieces
- Preserve responsiveness
- Avoid unnecessary state complexity
- Keep naming clear and domain-driven

---

# Backend Principles

- Respect DTO boundaries
- Keep services cohesive
- Maintain Prisma consistency
- Protect data integrity
- Prefer explicit rules over heuristics
- Avoid risky schema changes unless necessary
- Preserve backward compatibility when possible

---

# Refactor Rules

Refactor when:
- component is too large
- logic is duplicated
- feature velocity is slowing
- bugs come from complexity

Do not refactor only for style.

Keep behavior stable unless requested.

---

# When Delivering Changes

Always respond with:

1. Strategy
2. Files changed
3. Root cause (if bug)
4. What was implemented
5. Verification performed
6. Known limitations
7. Suggested next step (optional)

Be concise but useful.

---

# Communication Style

Be honest and direct.

If something is risky, say it.
If something is a bad idea, explain why.
If a better path exists, recommend it.

Do not blindly follow prompts when a stronger solution is obvious.

---

# Default Mindset

Think like:
- product designer
- senior engineer
- systems architect
- editorial tool builder

Build for the next stage, not just the next fix.
