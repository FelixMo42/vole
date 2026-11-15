# Congressional database

## Website

The directory is a static website with no dependencies, build step, or backend.
Search names and combine chamber, party, and election-year filters. Names are
searched without case or accent sensitivity. Each card shows all available fields.

To preview locally, run `python3 -m http.server 8000` from this directory and open
http://localhost:8000. Opening `index.html` directly with a `file://` URL will not
allow the browser to fetch the database.

To host on GitHub Pages, push the files to your repository, then choose
**Settings → Pages → Deploy from a branch**, select your branch and **/ (root)**,
and save. Keep `index.html`, `styles.css`, `app.js`, `scoring.js`, `db.json`,
`scorecards.json`, and `PLAN.md` together.
All asset URLs are relative, so repository project URLs work too. Updating
`db.json` updates the directory without rebuilding it.

## Calls-to-action explorer and management

Open `actions.html` to browse calls to action, including the Ban Artificial
Superintelligence Act, see linked House/Senate bills, filter politicians by
state, chamber, or legislative record, and prepare requests.
Each action has a shareable URL, e.g. `actions.html#superintelligence-ban`.
Legislative records include historical actions and are not a current sponsor list.

Open `manage.html` for the content editor. Select an action to edit it, or use
**Add a call to action**. Select a politician to add or edit a sourced sponsorship, cosponsorship,
or recorded vote. Legislative evidence is shared with the directory's scorecards.

This project remains static: the editor stores drafts in this browser's
local storage, with an in-memory fallback if storage is unavailable. It does
not write to the server. Public pages read only the published JSON files,
not local drafts. There is no authenticated administration service. Visitors
cannot publish changes through the editor. Downloads and imports support
backups and moving drafts between browsers.

To publish edits:

1. Save each edited form. Download `calls-to-action.json` from the editor.
2. If you changed legislative evidence, also download `scorecards.json`.
3. Replace those files in this directory, review the diff and primary sources,
   and run `node --test tests/*.test.cjs`.
4. Commit and redeploy the static site. Include `actions.html`, `actions.js`,
   `actions-data.js`, `manage.html`, `manage.js`, and `calls-to-action.json`
   alongside the existing assets. The editor links to published pages; draft
   changes appear there only after publication.

`calls-to-action.json` is the central catalog. `actions` contain a stable `id`,
`title`, `description`, concrete `request`, `lifecycle` (`active` or `archived`),
optional rubric `priority_id` (or `null`), and `bill_ids` from the existing bill
registry. Add goals without a rubric link to create calls to action without
changing scoring. Linked bills must match the selected priority; register new
bills in `scorecards.json` first. Archive actions to retain their history.

The separate `scorecards.json` evidence records remain the source of truth for
legislative actions; the explorer derives its records using linked bill IDs.

## AI safety scorecards

Every member has an expandable scorecard with three policy priorities, evidence,
and requests you can copy and send yourself. Filter by state or evidence coverage,
and link to a member with their Bioguide ID as a URL fragment (e.g. `#C001088`).
The full methodology is documented in `PLAN.md`.
Main cards show dated, sourced legislative actions before the score. Use
**Recorded action on bill** to find members with a documented action on a
specific bill, or select the superintelligence ban across both chambers.
Bill filters include
historical actions; dates and historical labels remain visible. These views
reflect our researched records, not complete current sponsor lists.

Rubric v3.0 rewards completed legislative actions only: sponsorship, official
cosponsorship, and recorded votes. Statements and promises earn no score or
coverage. The ban priority tracks the Ban Artificial Superintelligence Act
of 2026, S. 5493 and H.R. 10538. Requests ask for official cosponsorship in the
member's own chamber, or hearing requests and progress toward recorded votes
where sponsorship is already documented. They never assume an unlisted member
has refused to join. After a bill's Congress ends, drafts request a successor.

Research is deliberately labeled incomplete: 23 primary-source actions
concerning 21 members, with 15 members having recent evidence as of
November 14, 2026. Eight actions are historical. **No member currently meets the
60% coverage threshold (two of the three priorities) for an overall score.** Unknown records are not zeroes.
Partial support for disclosures is not treated as full support for independent
evaluations. These are advocacy priorities, not an objective overall political
rating. Scores age automatically based on the visitor's UTC date; the roster
itself remains a dated snapshot.

To maintain the research, edit `scorecards.json`. Add an evidence entry with a
unique `id`, roster `member_id`, rubric `priority`, `action` (`sponsor`,
`cosponsor`, or `vote`), `position` (`support`, `oppose`, or `mixed`),
action `date`, `reviewed_on`, primary-source `url`, `source_title`, and a narrow
`summary` explaining the interpretation. `mixed` includes partial alignment.
Each action also needs `bill_id` referencing the `bills` registry, with a matching
priority. Sponsorship must match the member's chamber. Recorded floor votes
add `vote` (`yea` or `nay`), `vote_question`, and an official `roll_call_url`;
abstentions and missed votes are not scored, and delegates cannot receive floor
vote records. The registry stores chamber, Congress, introduction and Congress
end dates, source URL, and source limitations. Source versions do not prove
the latest status or full current cosponsor list. One bill belongs to one
priority, preventing one sponsorship from earning credit across the rubric.
The ban bill records use the introduced texts, including García's original
cosponsorship as listed in the House text. Later cosponsors remain unresearched.
Use ISO dates, retain contrary evidence, and update the dataset's `reviewed_on`.
A review date never refreshes the age of an action. Do not infer opposition
from a missing entry. Reviewed evidence edits should be independently checked
before treating this as a comprehensive congressional scorecard.

Run `node --test tests/*.test.cjs` to validate the dataset, scoring rules, and
browser behavior without installing dependencies. `node --check app.js` checks
browser-script syntax. Tests use synthetic evidence to exercise score thresholds;
synthetic records are never included in the published dataset.

## Data

`db.json` contains the 539 serving members listed by the official U.S. House
and Senate rosters retrieved on November 13, 2026: 439 House members (including
the five delegates and Puerto Rico's resident commissioner) and 100 senators.
Vacant seats and members-elect who have not taken office are excluded.

Sources:

- House Clerk: https://clerk.house.gov/xml/lists/MemberData.xml
  (published November 3, 2026).
- Senate: https://www.senate.gov/general/contact_information/senators_cfm.xml

Each legislator preserves the original database fields:

- `name`: the name supplied by the official chamber roster.
- `party`: `D` (Democratic), `R` (Republican), or `I` (Independent).
- `office`: `house` or `senate`.
- `next_election_year`: the next regularly scheduled election for the seat
  after November 13, 2026, regardless of whether the incumbent will run.
  The November 2026 election has already occurred. House seats next have
  elections in 2028, including Puerto Rico's four-year resident commissioner
  seat. Senate classes I, II, and III next have regular elections in 2030,
  2032, and 2028 respectively. Unscheduled future special elections are not
  predicted. This field does not imply that a departing incumbent was reelected.

Additional identity fields are `id` (Bioguide ID), `state` (postal abbreviation),
and `district` (the House Clerk's district label, or `null` for senators), taken
from the same official rosters. Evidence joins by `id`, not by a person's name.

Records are sorted by office, then name. This is a dated snapshot; membership
and party affiliations can change before the next regular election.
