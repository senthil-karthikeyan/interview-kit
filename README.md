# InterviewKit

> Turn any job description into a tailored, end-to-end interview preparation kit — powered by AI.

InterviewKit is a production-grade full-stack platform and batch processing system. Given a job description, a company website URL, and an available preparation timeframe, InterviewKit extracts structured requirements, researches the company and interview process, generates targeted interview questions with model answers, produces revision flashcards, and builds an adaptive day-by-day study schedule.

---

## Key Features

- **Grounded Requirement Extraction**: Analyzes raw job postings to extract role metadata, responsibilities, and qualifications classified into `must` and `nice` priorities across `technical`, `behavioural`, and `domain` areas.
- **SSRF-Safe Company Crawler**: Discovers and crawls public company pages with robots.txt compliance, timeouts, streaming size limits, HTML sanitization, and private IP/hostname protection.
- **Verifiable Company Intelligence**: Summarizes company mission, products, and public interview processes with transparent source citations and honest handling when information is unavailable.
- **Coverage Engine with Gap Filling**: Programmatic verification ensuring all must-have requirements have corresponding interview questions, running automated gap-filling generation loops (up to 3 passes).
- **Adaptive Study Scheduling**: Deterministic round-robin allocation that fronts high-priority and difficult questions, calculates realistic integer study minutes, and generates daily thematic focus labels.
- **Kit Builder with State Preservation**: Fine-tune generated kits by editing prompts, outlines, categories, or difficulties. Pin items to preserve them across category-level regenerations (`generated` vs `edited` vs `pinned` states).
- **Interactive Practice Mode**: Spaced revision for concept flashcards with one-at-a-time focus, recall confidence rating (1–5), recall-prioritized card ordering, and session analytics.
- **High-Throughput Batch CLI**: Complete command-line batch runner with individual case failure isolation, detailed progress reporting, and strict JSON output schema conformance.

---

## Monorepo Architecture

The repository is organized as a pnpm workspace:

```
InterviewKit/
├── apps/
│   ├── api/                     # Express REST API, MongoDB/Mongoose, Batch CLI
│   │   ├── src/
│   │   │   ├── batch/cli.ts     # Batch CLI runner command
│   │   │   ├── db/              # MongoDB connection manager
│   │   │   ├── middleware/      # Auth, error handling, rate limiting
│   │   │   ├── modules/
│   │   │   │   ├── auth/        # Session authentication & user model
│   │   │   │   ├── coverage/    # Deterministic coverage engine & tests
│   │   │   │   ├── extraction/  # JD requirement extraction service
│   │   │   │   ├── generation/  # Question & flashcard generation services
│   │   │   │   ├── kits/        # Kit orchestration pipeline, model, handlers
│   │   │   │   ├── research/    # Company brief & interview research
│   │   │   │   └── scheduling/  # Study schedule allocation engine & tests
│   │   │   └── services/
│   │   │       ├── ai.service.ts # LLM provider singleton
│   │   │       └── crawler/     # Web crawler, robots.txt, SSRF validator
│   │   └── vitest.config.ts
│   │
│   └── web/                     # React 18 + Vite + Tailwind CSS frontend
│       └── src/
│           ├── api/             # Typed API client
│           ├── components/      # Navigation, route guards
│           ├── context/         # AuthContext provider
│           └── pages/           # Landing, Auth, Dashboard, Kit Builder, Practice
│
└── packages/
    ├── ai/                      # LLM provider abstraction & Gemini client
    │   └── src/
    │       ├── gemini.provider.ts # Gemma 4 26B (gemma-4-26b-a4b-it) provider with bounded concurrency & retries
    │       └── provider.ts      # LLMProvider interface definition
    ├── schemas/                 # Shared Zod schemas & TypeScript definitions
    │   └── src/
    │       ├── ai.schema.ts     # Pipeline input/output schemas
    │       ├── api.schema.ts    # Request & mutation schemas
    │       ├── batch.schema.ts  # Batch runner input/output schemas
    │       └── kit.schema.ts    # Complete kit contract schemas
    └── shared/                  # Common constants and helpers
```

---

## Pipeline Execution Flow

```
Raw Job Description + Company URL + Days Available
                      │
                      ▼
       [1. Requirement Extraction]  ──► Grounded Must vs Nice
                      │
                      ▼
       [2. SSRF-Safe Web Crawler]   ──► Cleaned Web Pages
                      │
                      ▼
       [3. Company Intelligence]    ──► Summary + Interview Insights
                      │
                      ▼
       [4. Question Generation]     ──► Technical / Behavioural / Design / Fit
                      │
                      ▼
       [5. Flashcard Generation]    ──► Quick Concept Revision Cards
                      │
                      ▼
       [6. Coverage Loop]           ──► Check Must-Haves, Fill Gaps (Max 3 passes)
                      │
                      ▼
       [7. Study Schedule Engine]   ──► Priority-Weighted Day Allocation
                      │
                      ▼
       [8. Schema Validation]       ──► Final Kit JSON (Strict Contract)
```

---

## Getting Started

### Prerequisites

- **Node.js**: v20.x or higher
- **pnpm**: v9.x or higher
- **MongoDB**: Local instance (`mongodb://localhost:27017/interviewkit`) or MongoDB Atlas URI
- **Google Gemini API Key**: For structured AI generation

### Installation

```bash
# Clone the repository
git clone https://github.com/senthil-karthikeyan/InterviewKit.git
cd InterviewKit

# Install dependencies across all workspaces
pnpm install
```

### Environment Configuration

Create a `.env` file in the repository root:

```env
# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=your_super_secret_session_key_min_32_chars

# Database
MONGODB_URI=mongodb://localhost:27017/interviewkit

# AI Provider
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemma-4-26b-a4b-it
LLM_CONCURRENCY=2
LLM_MAX_RETRIES=5

# Web Crawler
CRAWL_TIMEOUT_MS=10000
CRAWL_MAX_BYTES=500000
CRAWL_MAX_PAGES=10
ALLOW_LOCALHOST=true
```

### Running Locally

```bash
# Start backend API (port 3001) and frontend Vite server (port 5173) concurrently
pnpm run dev
```

Visit `http://localhost:5173` in your browser.

---

## Testing & Quality

All core engines (Coverage, Scheduling, URL validation, Input hashing, AI error handling, and Zod schemas) include comprehensive automated test suites:

```bash
# Run all workspace test suites
pnpm run test

# Run TypeScript compilation checks across all packages
pnpm run typecheck

# Build all packages and applications for production
pnpm run build
```

---

## Batch Execution

InterviewKit includes a standalone batch processing runner capable of processing multiple cases with per-case failure isolation and strict JSON output:

```bash
# Execute batch runner
npm run evaluate -- --input cases.json --output kits.json
```

### Batch Input Schema

```json
[
  {
    "id": "case-01",
    "jd": "Senior Software Engineer with 5+ years of TypeScript, Node.js, and distributed systems...",
    "company_url": "https://example.com",
    "days": 7
  }
]
```

### Batch Output Schema

```json
{
  "version": "1.0",
  "generated_at": "2026-09-23T19:00:00.000Z",
  "kits": [
    {
      "id": "case-01",
      "status": "ok",
      "kit": {
        "source": { ... },
        "company_brief": { ... },
        "role": { ... },
        "questions": [ ... ],
        "flashcards": [ ... ],
        "schedule": { ... },
        "coverage": { ... }
      },
      "error": null
    }
  ]
}
```

---

## Security & Reliability

- **SSRF Mitigation**: Validates all crawler destination URLs, restricts protocols to `http:` and `https:`, and blocks private IP ranges (10.x, 172.16-31.x, 192.168.x, 169.254.x, ::1, 0.0.0.0).
- **Prompt Injection Defense**: Untrusted external inputs (job descriptions, web page contents) are wrapped in delimiter tags and explicitly demarcated as text data rather than instructions.
- **Fail-Safe Crawling**: Failure to fetch or crawl a company website (e.g. timeout, 404, or robots.txt disallow) falls back gracefully to thin company profiles without failing kit generation.
- **Rate Limiting**: Configured with `express-rate-limit` across authentication and general API routes.
- **Deterministic Application Logic**: Coverage verification and schedule allocations are executed via deterministic TypeScript algorithms rather than LLM prompts, ensuring strict mathematical guarantees.

---

## License

MIT
