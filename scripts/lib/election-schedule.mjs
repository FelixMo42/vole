import assert from 'node:assert/strict';

export const electionSources = [
  'https://www.senate.ca.gov/citizens-guide/faqs',
  'https://clerk.assembly.ca.gov/legislative-information/elected-officials',
  'https://www.gov.ca.gov/2026/06/08/governor-newsom-issues-proclamation-declaring-californias-2026-general-election/',
];

/** Next regular general election on or after the as-of date in California. */
export function nextElectionYear(chamber, district, asOf) {
  assert(['senate', 'assembly'].includes(chamber), 'Unknown election chamber');
  assert(
    Number.isInteger(district) &&
      district >= 1 &&
      district <= (chamber === 'senate' ? 40 : 80),
    'Invalid election district',
  );
  const date = new Date(asOf);
  assert(!Number.isNaN(date.valueOf()), 'Invalid election as-of date');
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const currentYear = Number(parts.year);
  for (let year = currentYear; year <= currentYear + 4; year++) {
    const scheduled =
      chamber === 'assembly'
        ? year % 2 === 0
        : year % 4 === (district % 2 === 1 ? 0 : 2);
    if (!scheduled) continue;
    const firstMonday =
      1 + ((8 - new Date(Date.UTC(year, 10, 1)).getUTCDay()) % 7);
    const electionDate = `${year}-11-${String(firstMonday + 1).padStart(2, '0')}`;
    if (electionDate >= today) return year;
  }
  throw new Error('No regular election found');
}

export function applyElectionSchedule(dataset, asOf = dataset.retrievedAt) {
  dataset.schemaVersion = 2;
  dataset.electionSchedule = {
    asOf,
    kind: 'next-regular-seat-election',
    sourceUrls: [...electionSources],
  };
  for (const record of [...dataset.members, ...dataset.vacancies]) {
    record.nextElectionYear = nextElectionYear(
      dataset.chamber,
      record.district,
      asOf,
    );
  }
  return dataset;
}
