# Murphy's Law Planner

A plan stress-tester: describe a travel, event, project, move, or finance plan in plain English, pick a category, and get a structured "what could go wrong" report — each risk scored by likelihood x impact, with a concrete mitigation and a fallback contingency, plus blind spots the plan doesn't address and a pre-commit checklist.

Built in response to Angel's "Murphy's Law website" idea (Multica SORA-10): poke holes in a plan so you revise it before reality does it for you.

## How it works

- Pure, deterministic rule-based analysis in `src/lib/analyze.ts` — zero network calls, zero LLM, runs entirely client-side.
- A library of risk rules tagged by plan category (travel, event, project, move, finance, general) and matched against keywords in the plan description.
- Each matched risk gets a likelihood (1-5), impact (1-5), severity (likelihood x impact, max 25), a mitigation ("do this now"), and a contingency ("do this if it happens anyway").
- Overall risk score (0-100) is the average severity across matched risks, scaled; mapped to Low / Moderate / High / Severe.
- Blind-spot detection flags missing budget figures, missing dates, and missing backup-plan language in the raw text.
- Same input always produces the same output (unit-tested for determinism).

## Stack

- React 19 + TypeScript + Vite
- Vitest for unit tests on the core analysis logic (`npm test`)
- No backend, no API keys, no tracking — nothing typed into the form leaves the browser

## Development

```bash
npm install
npm run dev      # local dev server
npm test         # run unit tests
npm run build    # production build to dist/
```

## Deploy

Static site, deployed to Netlify. Build command `npm run build`, publish directory `dist`.
