# Development plan

## Objective

Add a reusable election-year field for every legislator and display it in both
searchable tables. Define it as the next regular election for the member's seat,
not a statement of candidacy or eligibility.

## Acceptance criteria

- Every member and vacancy has `nextElectionYear`, with schedule sources and an
  explicit as-of date at the dataset level.
- Regular Senate cycles account for odd/even district staggering; Assembly cycles
  occur every two years. Election-day rollover uses California local dates.
- Existing roster identity and retrieval metadata are preserved.
- The roster refresh command maintains the new field and validates it.
- Both tables display and search election years, remain readable on mobile,
  and include a brief explanation of the column.
- Data regression tests and all existing checks pass.

## Verification

- Added `nextElectionYear` to every member and vacancy in schema version 2, with
  official schedule sources and an explicit as-of timestamp. Roster timestamps,
  identities, source URLs, and source hashes were preserved.
- Years are 2028 for Assembly and odd Senate districts, and 2030 for even Senate
  districts, based on the next regular election after November 3, 2026.
- Six data regression tests passed, including special-election seat cycles,
  California election-day boundaries, update persistence, and invalid year checks.
- Formatting, strict TypeScript, and production build passed. All sixteen
  desktop/mobile browser tests passed, including year search, combined filters,
  and static year values without JavaScript.
- Visually checked the four-column layout at 320px; compact mobile labels retain
  full accessible labels while avoiding cramped headers and party names.
