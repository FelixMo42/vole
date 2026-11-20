# Markdown static web template

Write pages in Markdown, with TypeScript and plain CSS available for
browser interactions. Vite renders Markdown to HTML during development and builds;
the published content works without JavaScript. No backend or external service
is required.

## Start

Use Node.js 24 (`nvm use` if you use nvm), then:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Edit `content/index.md` to write the homepage;
saving refreshes the preview.

## Write content

`content/index.md` supports headings, paragraphs, links, images, lists, quotes,
fenced code blocks, and tables. Replace the starter text with your own content:

```md
# My website

A paragraph with **emphasis** and a [link](https://example.com).

## A section

- First item
- Second item
```

Every top-level `content/*.md` file with a lowercase, hyphen-separated filename
becomes an HTML page. `content/index.md` is the homepage; for example,
`content/state-senate.md` becomes `state-senate.html`. Link to pages with relative
HTML paths such as `[State Senate](./state-senate.html)`.

Start each page with a plain-text `# Heading`: this supplies its visible heading
and browser title. All pages share `index.html` as their document shell, including
description and language. YAML front matter and nested content directories are
not enabled. Saving, adding, or removing Markdown pages refreshes the preview.

Section headings (`##` through `######`) automatically create a table of contents
with links to their heading anchors. It appears as right-aligned plain text, with
a 20px gap to the left of the centered content on screens at least 1200px wide,
and above the content on smaller
screens. Pages without section headings omit it. Both links and content work
without JavaScript. Repeated headings receive unique anchor suffixes.

Put images and downloads in `public/`. For example, `public/images/photo.jpg` can
be referenced with `![Description](./images/photo.jpg)`. Use relative paths to
support hosting under a subdirectory.

Style the rendered Markdown in `src/styles.css`. For custom interactive elements,
include HTML in the Markdown and attach behavior in `src/main.ts`:

```html
<button type="button" id="show-details" aria-expanded="false">Details</button>
<p id="details" hidden>More information.</p>
```

```ts
const button = document.querySelector<HTMLButtonElement>('#show-details');
const details = document.querySelector<HTMLElement>('#details');

button?.addEventListener('click', () => {
  if (!details) return;
  details.hidden = !details.hidden;
  button.setAttribute('aria-expanded', String(!details.hidden));
});
```

Markdown is parsed by [Marked](https://marked.js.org/) in `vite.config.ts`, not
shipped as a browser dependency. Raw HTML is supported for repository-authored
content; this is not a pipeline for untrusted user submissions. Keep the
`<!-- page-content -->` marker in `index.html` where the content should appear.

## Reusable legislator data

The two JSON datasets in `data/` contain California's serving Senate and Assembly
members, plus separate vacancy records covering every district. They include
official profile links, party, district, available office details, and source and
verification metadata. They can be imported by any page or tool without a backend.

See [data/README.md](data/README.md) for fields, reuse examples, coverage limits,
and refresh instructions. Run `npm run data:update` to fetch the latest official
rosters and `npm run data:check` to validate the stored data offline. The full
check and CI include data validation; builds never fetch live rosters.

The State Senate and State Assembly pages include searchable member tables.
The Markdown markers `<!-- legislators:senate -->` and
`<!-- legislators:assembly -->` insert lists rendered from these datasets during
development and builds. Search filters by name, party, exact district number,
available counties, and next election year, ignoring accents and case. Multiple words narrow the
results together. The lists remain readable without JavaScript; search controls
appear when the browser enhancement loads. Dataset changes refresh the preview.

The Next election column shows each seat's next regular general-election year
as of the dataset's election-schedule date. It does not establish the incumbent's
candidacy or eligibility, and excludes special elections. Schedule sources and
calculation details are documented in `data/README.md`.

## Verify

Install the browser once, then run the full check:

```sh
npx playwright install chromium
npm run check
```

The check verifies formatting and TypeScript, builds the site, and tests the
production output in desktop and mobile Chromium, including reading the Markdown
without JavaScript. GitHub Actions runs the same
checks for pushes and pull requests and saves browser diagnostics on failure.

Playwright is pinned to 1.57.0 for compatibility with this workspace's macOS 13.
When upgrading it, verify browser support on both the development machine and CI.

For individual steps:

```sh
npm run format
npm run typecheck
npm run build
npm test
npm run test:ui
```

Build before running tests directly: Playwright launches the production preview
on port 4173, which must be available. Extend `tests/smoke.spec.ts` or add behavior
tests as features are introduced.

## Static hosting

```sh
npm run build
npm run preview
```

Publish the generated `dist/` directory to a static host. Asset paths are relative
so the starter also works under a subdirectory. No deployment is configured.
Client-side routing, if added later, needs an appropriate host fallback or hash
routing. Browser code is public; never include credentials in it.

## Working with agents

`AGENTS.md` gives coding agents the repository structure, constraints, commands,
and verification expectations. `docs/PLAN.md` is a lightweight place to track
substantial tasks and acceptance criteria. The lockfile, strict TypeScript,
Prettier, browser checks, and CI provide reproducible feedback without requiring
a specific agent platform or account.
