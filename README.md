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
and save. Keep `index.html`, `styles.css`, `app.js`, and `db.json` together.
All asset URLs are relative, so repository project URLs work too. Updating
`db.json` updates the directory without rebuilding it.

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

Records are sorted by office, then name. This is a dated snapshot; membership
and party affiliations can change before the next regular election.
