import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  buildDataset,
  chambers,
  validateDataset,
} from '../scripts/lib/legislators.mjs';
import { nextElectionYear } from '../scripts/lib/election-schedule.mjs';

const retrievedAt = '2026-11-20T00:00:00.000Z';

function senateFixture() {
  return Array.from({ length: 40 }, (_, index) => {
    const district = index + 1;
    const vacant = district === 10;
    return `<div class="page-members__member" data-district="${district}" data-party="${vacant ? 'V' : 'D'}">
      <h3 class="member__name">${vacant ? 'Member Vacant' : `Example ${district}`}</h3>
      <img data-src="/portrait-${district}.jpg">
      <a class="member__link" href="https://sd${district}.senate.ca.gov/">Homepage</a>
      <a class="member__link" href="https://lcmspubcontact.lc.ca.gov/contact?district=${district}&amp;amp;inframe=N">Contact</a>
      <div class="member__office --capitol"><p class="member__address">Test address; (916) 555-0100</p></div>
    </div>`;
  }).join('');
}

test('stored rosters cover every district and distinguish members from vacancies', async () => {
  const ids = [];
  for (const config of Object.values(chambers)) {
    const data = JSON.parse(
      await readFile(
        new URL(`../data/${config.file}`, import.meta.url),
        'utf8',
      ),
    );
    validateDataset(data);
    ids.push(...data.members.map((member) => member.id));
    assert.equal(data.members.length + data.vacancies.length, config.seats);
    for (const vacancy of data.vacancies) assert.equal(vacancy.id, undefined);
    const duplicate = structuredClone(data);
    duplicate.members[1].district = duplicate.members[0].district;
    assert.throws(() => validateDataset(duplicate), /unique/);
  }
  assert.equal(new Set(ids).size, ids.length);
});

test('Senate import decodes contacts, resolves portraits, and separates offices and vacancies', () => {
  const data = buildDataset('senate', senateFixture(), retrievedAt);
  assert.equal(data.members.length, 39);
  assert.equal(data.vacancies[0].district, 10);
  assert.equal(
    data.members[0].contactUrl,
    'https://lcmspubcontact.lc.ca.gov/contact?district=1&inframe=N',
  );
  assert.equal(
    data.members[0].portraitUrl,
    'https://www.senate.ca.gov/portrait-1.jpg',
  );
  assert.equal(data.members[0].offices[0].address, 'Test address');
  assert.equal(data.members[0].offices[0].phone, '(916) 555-0100');
  assert.equal(data.members[0].counties, null);
});

test('Assembly import retains names, counties, and unknown contact details', () => {
  const html = Array.from(
    { length: 80 },
    (
      _,
      index,
    ) => `<li class="members-list__member" data-district="${index + 1}" data-party="Democrat" data-counties="LOS ANGELES, ORANGE">
    <h2 class="members-list__name">Family${index}, Dr. Given</h2>
    <p class="members-list__suite">Suite 1000</p>
    <a class="members-list__details" href="/assemblymembers/${index + 1}">View details</a>
  </li>`,
  ).join('');
  const data = buildDataset('assembly', html, retrievedAt);
  assert.equal(data.members[0].name, 'Dr. Given Family0');
  assert.equal(data.members[0].sourceName, 'Family0, Dr. Given');
  assert.deepEqual(data.members[0].counties, ['LOS ANGELES', 'ORANGE']);
  assert.equal(data.members[0].contactUrl, null);
  assert.equal(data.members[0].offices[0].phone, null);
});

test('incomplete or changed roster markup fails instead of producing misleading data', () => {
  assert.throws(
    () => buildDataset('senate', '<html></html>', retrievedAt),
    /every seat/,
  );
  assert.throws(
    () =>
      buildDataset(
        'senate',
        senateFixture().replace('data-party="D"', 'data-party="unknown"'),
        retrievedAt,
      ),
    /party/,
  );
  assert.throws(
    () =>
      buildDataset(
        'senate',
        senateFixture().replace('class="member__name"', 'class="changed"'),
        retrievedAt,
      ),
    /name/,
  );
});

test('election schedules distinguish Assembly, staggered Senate seats, and election-day rollover', () => {
  assert.equal(nextElectionYear('assembly', 1, '2026-11-02T12:00:00Z'), 2026);
  assert.equal(nextElectionYear('assembly', 1, '2026-11-03T12:00:00Z'), 2026);
  assert.equal(nextElectionYear('assembly', 1, '2026-11-04T12:00:00Z'), 2028);
  assert.equal(nextElectionYear('senate', 1, '2026-11-20T00:00:00Z'), 2028);
  assert.equal(nextElectionYear('senate', 2, '2026-11-02T12:00:00Z'), 2026);
  assert.equal(nextElectionYear('senate', 2, '2026-11-20T00:00:00Z'), 2030);
  assert.equal(nextElectionYear('senate', 36, '2025-06-01T12:00:00Z'), 2026);
  // Midnight UTC is still election day in California.
  assert.equal(nextElectionYear('assembly', 1, '2026-11-04T01:00:00Z'), 2026);
  assert.equal(nextElectionYear('assembly', 1, '2026-11-04T08:00:00Z'), 2028);
  assert.equal(nextElectionYear('senate', 1, '2028-11-08T12:00:00Z'), 2032);
  assert.throws(() => nextElectionYear('senate', 0, retrievedAt), /district/);
  assert.throws(() => nextElectionYear('assembly', 1, 'invalid'), /date/);
});

test('refreshing a roster retains election years and rejects incorrect stored years', () => {
  const dataset = buildDataset('senate', senateFixture(), retrievedAt);
  assert.equal(dataset.schemaVersion, 2);
  assert.equal(dataset.electionSchedule.asOf, retrievedAt);
  assert.equal(
    dataset.members.find((member) => member.district === 1).nextElectionYear,
    2028,
  );
  assert.equal(
    dataset.members.find((member) => member.district === 36).nextElectionYear,
    2030,
  );
  assert.equal(dataset.vacancies[0].nextElectionYear, 2030);
  dataset.members[0].nextElectionYear = 2026;
  assert.throws(() => validateDataset(dataset), /Incorrect next election year/);
});
