# AI safety scorecards: plan and methodology

## Purpose

Help visitors inspect a federal legislator's documented AI safety record and
choose a concrete policy request. This is an explicit advocacy rubric for
reducing serious AI harms, not an objective measure of a person's overall merit.
Keep the website static and compatible with GitHub Pages.

## Current rubric: v3.0

The three scorecard priorities match the calls-to-action catalog. Serious
incident reporting, public-sector safety capacity, and enforceable accountability
have been removed from scoring. Each remaining priority contributes one third of
coverage; two documented recent priorities meet the unchanged 60% threshold.

## Revision: actions, not endorsements (November 14, 2026)

Only sponsorship, official cosponsorship, and recorded legislative votes count
toward scores or coverage. Speeches, interviews, social-media posts, promises,
and signing public letters earn no points. A source may be an official
announcement, but it must document a completed legislative action.

The rubric includes three equally weighted priorities: safety evaluations and
transparency, whistleblower protections, and the superintelligence ban. Track the
Ban Artificial Superintelligence Act of 2026 as S. 5493 (Senate) and H.R. 10538
(House). Use introduced bill text to record Sanders's sponsorship and Casar's
sponsorship plus the nine original House cosponsors. These sources do not
establish the complete current cosponsor list, withdrawals, or later votes.
Never describe a missing record as refusal to cosponsor.

Each evidence entry must reference a bill in a public registry with its chamber,
Congress number, official source, and introduction date. Sponsorship must match
the member's chamber; vote evidence requires an official roll-call link and
explicit recorded vote. Ordinary recorded votes cannot be attributed to House
delegates or Puerto Rico's resident commissioner; committee votes would need a
separate scoped model. Preserve the 365-day recent-action window and historical
records. Deduplicate repeated evidence; a single bill contributes only to its
assigned priority, rather than filling several buckets with one action.

Show three equal priorities (one third each, about 33.3%). A 60% coverage threshold
therefore requires documented recent actions on at least two priorities.
Statements must be excluded even if passed directly to the scoring engine.
Use action labels throughout the interface and methodology.

Requests should ask for official cosponsorship of the correct chamber's bill,
not a declaration of support. Where sponsorship/cosponsorship is already
documented, ask for a hearing request and efforts to secure a recorded vote
instead. If the directory has no action record, ask conditionally and invite
the office to supply the official record; do not assume nonparticipation.
For priorities without a verified bill, ask the member to introduce legislation
or an amendment with the specified provisions. Never suggest an invented bill
number or a vote that is not scheduled. Display source dates and verify current
bill status with the office. After a bill's Congress ends, ask for successor
legislation rather than cosponsorship of an expired bill.

Tests must prove that statements earn zero score and zero coverage, a statement
cannot negate a real action, speech-only records prompt an action, sponsorship
maps to the correct person and bill, and drafts distinguish House/Senate and
existing sponsors from members without a recorded action.

## Implementation

1. Give every member a stable Bioguide ID; add state/district from official
   rosters so evidence attaches to the correct person.
2. Publish a versioned rubric in `scorecards.json` with three equally weighted
   priorities: safety evaluations and transparency, whistleblower protections,
   and a superintelligence ban. Each priority includes a specific legislative request.
3. Store dated, attributed evidence separately from the roster. Every entry
   identifies the member, priority, action, position, primary-source URL,
   source date, review date, and a narrow explanation. Start with verified
   primary-source examples, label research incomplete for every member, and
   never manufacture positions for the rest of Congress.
4. Implement a shared, testable scoring engine. A verified supportive action
   earns 100 on a priority, opposition earns 0, and an explicitly mixed record
   or partial alignment earns 50. Only legislative actions count; statements
   earn no score or coverage. These are action alignment scores, not estimates of effectiveness.
   Collapse repeated actions to the strongest action per direction; opposing
   evidence in the same priority produces a mixed assessment. Missing evidence
   is unknown, never opposition. Evidence older than 365 days is historical,
   visible but excluded from the current score. Do not infer a position from
   party, silence, donations, or unrelated AI legislation.
5. Show known-priority alignment and weighted evidence coverage separately.
   Publish an overall /100 score only when at least 60% of total rubric weight
   has current evidence. Until then show “Insufficient evidence” plus provisional
   alignment on the documented portion. Prevent lightly researched members
   from topping the overall ranking. Display evidence age and limitations.
6. Add an accessible expandable scorecard for every member: priority-by-priority
   findings, dated action links, explanations, and legislative requests. Missing
   actions prompt conditional cosponsorship or introduction requests; existing
   sponsors get requests for hearings and progress toward recorded votes.
   Provide a copyable request including the member, policy, and a friendly invitation to share their perspective and possible next steps. Link official contact directories.
   Do not invent bill deadlines, committee powers, cosponsorship availability,
   or voting opportunities. No messages are sent automatically.
7. Preserve directory filters; add state, score coverage, and overall-score
   sorting. Add a visible methodology panel and a research-coverage summary.
8. Validate data integrity, evidence references, missing-data handling, stale
   evidence, contradictory evidence, deduplication, weights, score eligibility,
   and the static page's loading/filtering behavior using dependency-free tests.
   Document maintenance and local preview commands.

## Editorial and maintenance rules

Use bill text, roll calls, and official sponsor lists. Members' announcements
qualify only when they document completed legislative action. Sponsorship proves support for the cited proposal, not every part
of a broad priority. Cite that limitation. Absence from a sponsor list is not
opposition. Do not automatically equate an entire omnibus vote with an AI
position. Separate historical actions from present commitments. Explain conflicts
and preserve all cited evidence. A research date is not an action date.

Initial sources: the Senate Judiciary Committee's May 15, 2025 announcement
of the AI Whistleblower Protection Act, the official House introduction
announcement, and GovInfo's introduced text/metadata for S. 5471 (September
23, 2026). Verify each source before adding evidence. Broad priorities are
editorial proposals, not claims that a particular bill is pending or sufficient.

For updates, review primary sources, edit the evidence JSON through a reviewed
repository change, run tests, update the dataset review date, and redeploy.
Remove or correct unsupported entries and document the correction in repository
history. Before publishing a comprehensive ranking, review every member across
all three priorities, invite corrections and responses through the repository's
issue tracker, and have another reviewer verify scoring decisions. An incomplete
seed dataset must never be described as a comprehensive congressional rating.

## Acceptance criteria

- Every roster member has a scorecard and three concrete legislative requests.
- Scores and explanations are reproducible from public JSON and source links.
- Unknown, historical, mixed, and opposing records remain distinguishable.
- The site prominently discloses incomplete research and the snapshot date.
- All behavior runs in the browser; no keys, accounts, backend, or build needed.
