# Agent instructions

## Scope

This repository starts as an empty interactive static website. Keep it static
unless the user asks for a backend. Do not add product content, frameworks, remote
services, analytics, or deployment infrastructure without a task that needs them.

## Layout

- `index.html`: document shell and metadata.
- `content/*.md`: pages; `index.md` is the homepage and other lowercase,
  hyphen-separated filenames become matching `.html` pages. Each page needs a
  plain-text `# Heading` for its document title. Use relative `.html` links.
  Write prose here rather than in HTML or TypeScript. Vite renders Markdown into
  the `<!-- page-content -->` marker in the shared `index.html` shell.
- `vite.config.ts`: build-time Markdown rendering and development reload.
  Generates unique heading IDs and the `<!-- page-toc -->` navigation from section
  headings. Preserve both template markers when editing the shared shell.
- `src/main.ts`: browser entry point; add focused modules under `src/` as needed.
- `scripts/render-legislators.ts`: renders dataset-backed member tables for the
  `<!-- legislators:senate -->` and `<!-- legislators:assembly -->` Markdown markers.
- `src/member-search.ts`: browser enhancement for filtering those static tables.
- `src/styles.css`: base styles.
- `public/`: optional files copied unchanged to the build.
- `data/`: reusable California chamber rosters and shared types; see `data/README.md`.
  Use member IDs for person references and `seatId` for districts. Vacancies are
  separate from members. Do not invent missing values or replace current members
  with election winners before the official rosters change.
  `nextElectionYear` describes a seat's regular election schedule as of
  `electionSchedule.asOf`; do not label it as confirmed candidacy or eligibility.
- `scripts/update-legislators.mjs`: refresh both datasets from official rosters;
  review changes after running `npm run data:update`.
- `tests/`: Playwright tests against the production build.
- `docs/`: development plans and architectural decisions.
- `dist/`: generated output; never edit or commit it.

## Workflow

1. Read `README.md`, inspect the relevant code, and run `git status --short`.
   Preserve existing user changes. Do not restore deleted files or commit, push,
   publish, or reset the repository unless asked.
2. For substantial work, record a short plan and acceptance criteria in
   `docs/PLAN.md`. Keep it current and record verification results before handoff.
   Small changes do not need a plan.
3. Make the smallest complete change. Prefer native browser APIs, semantic HTML,
   strict TypeScript, and accessible controls. Support keyboard use and narrow
   screens. Respect reduced-motion preferences for any added animation.
   Keep content in Markdown and use TypeScript only for browser interactions.
   Markdown may contain trusted HTML for custom interactive elements; never
   render untrusted submissions through the build-time parser.
4. Never put credentials in source or browser code. All client-side configuration,
   including Vite's `VITE_*` variables, is public. Add dependencies only when
   justified and commit the updated lockfile with dependency changes.
5. Run `npm run check` before handing off code. Install Chromium with
   `npx playwright install chromium` if needed. Tests use `dist/`, so run
   `npm run build` before a standalone `npm test`. Add behavior tests when they
   protect meaningful functionality; avoid tests that merely mirror code.
6. Summarize what changed, verification performed, and any remaining limitations.
   If a check cannot run, state that explicitly.

## Development commands

- `npm ci`: install the exact locked dependencies.
- `npm run dev`: start the local development server.
- `npm run build`: type-check and produce `dist/`.
- `npm run preview`: serve the production build locally.
- `npm run format`: format repository files.
- `npm run check`: formatting, production build, desktop/mobile smoke tests.
- `npm run data:check`: offline dataset validation and importer regression tests.

Agents can use their available browser tools with the local server. No particular
agent provider, hosted service, or external credential is required.
