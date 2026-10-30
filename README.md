# EvidenceCheck AI

EvidenceCheck AI is a citation-audited, contradiction-aware evidence investigation platform. A user submits a factual claim; the system retrieves supporting and challenging evidence via Tavily, extracts and indexes atomic passages, synthesizes findings and analyzes contradictions with NVIDIA Nemotron 120B, and deterministically validates quotations against retrieved passages.

---

## Key Innovations

1. **Bidirectional Evidence Retrieval**: Automatically formulates distinct, neutral supporting and adversarial search queries via Nemotron to prevent single-perspective confirmation bias.
2. **Deterministic Quotation Validation**: Every drafted citation is programmatically audited for exact contiguous substring existence in the retrieved source snippet. Paraphrasing artifacts and hallucinated ellipses are rejected.
3. **Atomic Passage Provenance**: Every piece of evidence is assigned an immutable passage ID (`psg-1`, `psg-2`) with character offset indices.
4. **Contradiction-Aware Verdicts**: Identifies evidential tensions and enforces `INSUFFICIENT_EVIDENCE` when evidence is thin or uncorroborated, rather than inventing false certainty.
5. **Heuristic Support Index**: Scores evidence support on a transparent `0.00 – 1.00` heuristic index based on verified source diversity and citation consistency; never displayed as a calibrated probability.

---

## Live Benchmark Verification

The core pipeline has been end-to-end verified against real live APIs:
- **Claim**: *"The speed of light in a vacuum is approximately 299,792 kilometers per second."*
- **Outcome**: Status `SUPPORTED` (Support Index: `0.75`), 4 authentic unique sources, 20 segmented passages, 2 verified citations, 1 rejected citation.
- **Duration**: `32.5s` end-to-end.
- **Artifact**: A verified report is bundled in `src/data/verified-archive-report.json` and accessible instantly in the web interface under **Verified Run**.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack, React 19, TypeScript 5)
- **Styling**: Tailwind CSS v4 (responsive dark-first interface)
- **AI Inference**: NVIDIA Nemotron (`nvidia/nemotron-3.5-super-vl-120b-a12b`) via OpenAI-compatible NIM endpoint
- **Search Retrieval**: Tavily Basic Search API (bidirectional dual query)
- **Validation**: Zod schema enforcement across all input, query plans, analyzer responses, and reports
- **Database**: PostgreSQL with `pg` driver (optional; e.g. Neon Serverless Postgres or Supabase)

---

## Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/your-username/evidencecheck-ai.git
cd evidencecheck-ai
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your credentials:
```ini
NVIDIA_API_KEY=your_nvidia_api_key_here
NVIDIA_MODEL=nvidia/nemotron-3.5-super-vl-120b-a12b
TAVILY_API_KEY=your_tavily_api_key_here
TAVILY_MAX_SEARCHES=20

# Optional: Durable PostgreSQL persistence (e.g. Neon, Supabase)
DATABASE_URL=postgres://user:password@host:5432/evidencecheck?sslmode=require
```

### 3. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 4. Run Verification Suite
```bash
# Runs 57 deterministic unit, schema, parser, and pipeline tests
npm test

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Production build
npm run build
```

---

## Deployment & Production Safeguards

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full deployment instructions, including:
- Vercel Fluid Compute timeout guidelines (accommodating 32.5s execution up to 300s limits).
- Credit protection safeguards and fail-closed public access controls.
- PostgreSQL schema migration script.

---

## License

This project is licensed under the [MIT License](LICENSE).
