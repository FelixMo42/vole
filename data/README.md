# California legislators

Two standalone JSON databases for reuse across the static site and other tools:

- `california-senators.json`: California State Senate.
- `california-assembly-members.json`: California State Assembly.

Both follow the interfaces in `types.ts` and are sorted by district. They describe
serving members as listed on the official rosters when retrieved, rather than
candidates, election winners awaiting office, or historical membership.

## Initial snapshot

Retrieved November 19, 2026 in Los Angeles (November 20 UTC):

| Chamber  | Members | Vacancies   | Districts accounted for |
| -------- | ------- | ----------- | ----------------------- |
| Senate   | 39      | District 10 | 40                      |
| Assembly | 79      | District 3  | 80                      |

Sources: [California State Senate roster](https://www.senate.ca.gov/senators) and
[California State Assembly roster](https://www.assembly.ca.gov/assemblymembers).
The sources list these vacancies explicitly; they are not missing imports.

## Fields and provenance

Each dataset includes its chamber, jurisdiction, seat/member/vacancy counts,
`schemaVersion`, UTC `retrievedAt`, official source URL, and a SHA-256 hash of the
retrieved HTML for identifying the source snapshot. This is not an archive of the
original HTML. Each record also has `sourceUrls` and a UTC `verifiedAt` timestamp.
Verification means the value was extracted from that roster, not that every
phone number or external link was independently tested.

Member fields:

- `id`: person reference, e.g. `ca-senate-megan-dahle`; independent of district.
- `name`: display name; Assembly names are reordered from the roster's
  last-name-first form, preserving initials and honorifics.
- `sourceName`: exact name spelling/order on the source, apart from whitespace.
- `party`: normalized `Democratic`, `Republican`, or `Independent`.
- `district`: numeric district; `seatId` identifies the chamber and district.
- `profileUrl`, `contactUrl`, `portraitUrl`: official links when available.
- `counties`: counties listed by the roster, retaining source capitalization.
- `offices`: available Capitol/district office addresses, rooms, and phones.
- `nextElectionYear`: the next regular general-election year for the member's
  seat, calculated as of `electionSchedule.asOf` (California local date).

Schema version 2 includes `electionSchedule` metadata with its own `asOf` date,
`kind: "next-regular-seat-election"`, and official `sourceUrls`. Election years
are derived from the regular cycle, rather than extracted from the member roster.
Roster retrieval/verification timestamps and source hashes are unchanged when
only election metadata is updated. Vacancy records also carry the seat's year.

Assembly seats are elected every two years. Odd-numbered Senate districts vote
in presidential-election years; even-numbered districts vote in gubernatorial
years. The calculation selects the next general election on or after the as-of
date, using the first Tuesday after the first Monday in November. After the
November 3, 2026 election, this gives 2028 for every Assembly seat and odd-numbered
Senate seat, and 2030 for even-numbered Senate seats. A senator elected in a
special election retains the regular district cycle.

These years describe seat elections; they do not establish that an incumbent
will run, be eligible, or remain in office until then. Special elections and
individual candidacy/term-limit research are outside this field's scope.

Sources: [Senate election-cycle FAQ](https://www.senate.ca.gov/citizens-guide/faqs),
[Assembly elected officials](https://clerk.assembly.ca.gov/legislative-information/elected-officials),
and the [2026 election proclamation](https://www.gov.ca.gov/2026/06/08/governor-newsom-issues-proclamation-declaring-californias-2026-general-election/).
Refreshing the datasets recomputes these years as of the new retrieval date;
ordinary builds retain the recorded snapshot.

Vacancies are in `vacancies`, with `status: "vacant"`, district/seat details, and
source metadata. They have no person ID or name and must not be counted as members.
A vacant district can retain a staffed office or official district website.

`null` means a value was not supplied by the roster, not that it does not exist.
The Senate roster supplies office addresses, phone numbers, and contact links,
but does not list counties. The Assembly roster supplies counties, Capitol suite
numbers, portraits, and official profile pages; it does not supply direct contact
links, phone numbers, full addresses, or district offices. Its `profileUrl` points
to the Assembly's official detail page, rather than an inferred personal website.
An empty office array means no offices were listed in the source.

Committees, biographies, term dates, emails, and funding information have not
been researched or added. Portraits are linked remotely, not downloaded.

## Reuse

From browser code under `src/`, Vite supports direct JSON imports:

```ts
import senate from '../data/california-senators.json';
import assembly from '../data/california-assembly-members.json';

const senators = senate.members;
const assemblyMembers = assembly.members;
const republicanSenators = senators.filter(
  (member) => member.party === 'Republican',
);
```

Other build scripts can read the same files using `JSON.parse`. No database
server, API key, runtime fetch, or extra runtime dependency is required. The
files are not automatically copied to the published site; import the data needed
by a view or use it in build-time rendering.

Use `id` to reference a person elsewhere and `seatId` to reference a seat. Do not
use array positions or district numbers as person identifiers. IDs initially
come from chamber plus normalized name, so a source name change or a move between
chambers requires review of IDs and any references. Keep researched annotations
in separate files keyed by member ID: the importer regenerates these two files
and will replace manual additions inside them.

## Refresh and validate

From the repository root:

```sh
npm run data:update
npm run data:check
npm run format
npm run check
```

The update command downloads only the two official roster pages, parses them
using Cheerio, validates both before writing either dataset, and prints member
and vacancy totals. Review the Git diff before using refreshed data. No scheduled
updates are configured and the build/test commands do not use the network.

To import freshly downloaded HTML instead of fetching from Node:

```sh
npm run data:update -- --senate-html /path/to/senate.html --assembly-html /path/to/assembly.html
```

This records the import time as `retrievedAt`; use only fresh downloads when
claiming a current snapshot. Source hashes still correspond to the supplied HTML.
Parser failures, unrecognized parties, duplicated districts, missing profiles,
or incomplete district coverage stop an update. Offline validation and regression
tests are included in `npm run check` and GitHub Actions.
