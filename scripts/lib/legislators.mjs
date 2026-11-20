import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import {
  applyElectionSchedule,
  electionSources,
  nextElectionYear,
} from './election-schedule.mjs';

export const chambers = {
  senate: {
    url: 'https://www.senate.ca.gov/senators',
    title: 'California State Senate',
    seats: 40,
    file: 'california-senators.json',
    selector: '.page-members__member',
  },
  assembly: {
    url: 'https://www.assembly.ca.gov/assemblymembers',
    title: 'California State Assembly',
    seats: 80,
    file: 'california-assembly-members.json',
    selector: '.members-list__member',
  },
};

const clean = (value = '') => value.replace(/\s+/g, ' ').trim();
const slug = (value) =>
  value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function absolute(value, base) {
  if (!value) return null;
  // The Senate roster double-encodes ampersands in its contact URLs.
  return new URL(value.replaceAll('&amp;', '&'), base).href;
}

export function buildDataset(chamber, html, retrievedAt) {
  const config = chambers[chamber];
  assert(config, 'Unknown chamber');
  const $ = load(html);
  const members = [];
  const vacancies = [];
  $(config.selector).each((_index, element) => {
    const card = $(element);
    const district = Number(card.attr('data-district'));
    const rawParty = card.attr('data-party');
    const vacant = ['V', 'Vacant'].includes(rawParty);
    const sourceName = clean(
      card
        .find(chamber === 'senate' ? '.member__name' : '.members-list__name')
        .text(),
    );
    assert(
      sourceName,
      `${chamber} district ${district}: member name is missing`,
    );
    let name = sourceName;
    if (chamber === 'assembly' && !vacant) {
      const [family, ...given] = sourceName.split(',');
      name = `${given.join(',').trim()} ${family}`.trim();
    }
    const party =
      {
        D: 'Democratic',
        Democrat: 'Democratic',
        R: 'Republican',
        Republican: 'Republican',
        I: 'Independent',
        Independent: 'Independent',
      }[rawParty] ?? null;
    const profileUrl = absolute(
      card
        .find(chamber === 'senate' ? '.member__link' : '.members-list__details')
        .first()
        .attr('href'),
      config.url,
    );
    const contactUrl =
      chamber === 'senate'
        ? absolute(card.find('.member__link').eq(1).attr('href'), config.url)
        : null;
    const image = card.find('img').first();
    const portraitUrl = vacant
      ? null
      : absolute(image.attr('data-src') ?? image.attr('src'), config.url);
    const counties =
      chamber === 'assembly'
        ? (card.attr('data-counties') ?? '')
            .split(',')
            .map(clean)
            .filter(Boolean)
        : null;
    const offices = [];
    if (chamber === 'senate') {
      card.find('.member__office').each((_officeIndex, officeElement) => {
        const office = $(officeElement);
        const kind = office.hasClass('--capitol') ? 'capitol' : 'district';
        office
          .find('.member__address')
          .each((_addressIndex, addressElement) => {
            const text = clean($(addressElement).text());
            if (!text) return;
            const phone = text.match(/\(\d{3}\)\s*\d{3}-\d{4}/)?.[0] ?? null;
            const address = clean(
              text.replace(/;?\s*\(\d{3}\)\s*\d{3}-\d{4}.*$/, ''),
            );
            offices.push({ kind, address: address || null, room: null, phone });
          });
      });
    } else {
      const room = clean(card.find('.members-list__suite').text());
      if (room)
        offices.push({ kind: 'capitol', address: null, room, phone: null });
    }
    const shared = {
      district,
      seatId: `ca-${chamber}-${String(district).padStart(2, '0')}`,
      profileUrl,
      contactUrl,
      counties,
      offices,
      sourceUrls: [config.url],
      verifiedAt: retrievedAt,
    };
    if (vacant) {
      vacancies.push({ ...shared, status: 'vacant' });
    } else {
      members.push({
        id: `ca-${chamber}-${slug(name)}`,
        name,
        sourceName,
        party,
        portraitUrl,
        ...shared,
      });
    }
  });
  const dataset = {
    schemaVersion: 1,
    jurisdiction: 'US-CA',
    chamber,
    title: config.title,
    seatCount: config.seats,
    memberCount: members.length,
    vacancyCount: vacancies.length,
    retrievedAt,
    source: {
      url: config.url,
      sha256: createHash('sha256').update(html).digest('hex'),
    },
    members: members.sort((a, b) => a.district - b.district),
    vacancies: vacancies.sort((a, b) => a.district - b.district),
  };
  applyElectionSchedule(dataset);
  validateDataset(dataset);
  return dataset;
}

export function validateDataset(dataset) {
  const config = chambers[dataset.chamber];
  assert(config, 'Dataset chamber must be senate or assembly');
  assert.equal(dataset.schemaVersion, 2);
  assert.equal(dataset.electionSchedule?.kind, 'next-regular-seat-election');
  assert(
    !Number.isNaN(Date.parse(dataset.electionSchedule.asOf)),
    'Invalid election schedule date',
  );
  assert.deepEqual(dataset.electionSchedule.sourceUrls, electionSources);
  assert.equal(dataset.jurisdiction, 'US-CA');
  assert.equal(dataset.seatCount, config.seats);
  assert.equal(dataset.source.url, config.url);
  assert.match(dataset.source.sha256, /^[a-f0-9]{64}$/);
  assert(
    !Number.isNaN(Date.parse(dataset.retrievedAt)),
    'Invalid retrieval date',
  );
  assert.equal(dataset.memberCount, dataset.members.length);
  assert.equal(dataset.vacancyCount, dataset.vacancies.length);
  const records = [...dataset.members, ...dataset.vacancies];
  assert.equal(
    records.length,
    config.seats,
    'Roster must account for every seat',
  );
  assert.equal(
    new Set(records.map((record) => record.district)).size,
    config.seats,
    'Districts must be unique',
  );
  assert.equal(
    new Set(dataset.members.map((member) => member.id)).size,
    dataset.members.length,
    'Member IDs must be unique',
  );
  for (const record of records) {
    assert.equal(
      record.nextElectionYear,
      nextElectionYear(
        dataset.chamber,
        record.district,
        dataset.electionSchedule.asOf,
      ),
      'Incorrect next election year',
    );
    assert(
      Number.isInteger(record.district) &&
        record.district >= 1 &&
        record.district <= config.seats,
      'Invalid district',
    );
    assert.equal(
      record.seatId,
      `ca-${dataset.chamber}-${String(record.district).padStart(2, '0')}`,
    );
    assert.equal(record.verifiedAt, dataset.retrievedAt);
    assert.deepEqual(record.sourceUrls, [config.url]);
    assert(Array.isArray(record.offices));
    assert(record.counties === null || Array.isArray(record.counties));
    for (const url of [
      record.profileUrl,
      record.contactUrl,
      record.portraitUrl,
    ].filter(Boolean)) {
      const parsed = new URL(url);
      assert(
        ['https:', 'http:'].includes(parsed.protocol),
        'Expected a public web URL',
      );
      assert(
        parsed.hostname.endsWith('.ca.gov'),
        'Expected an official California source',
      );
      assert(!url.includes('&amp;'), 'Contact URL is still HTML-encoded');
    }
    assert(record.profileUrl, 'Each seat needs an official profile URL');
    if (record.status === 'vacant') {
      assert(!record.id && !record.name, 'A vacancy is not a member');
    } else {
      assert.match(record.id, new RegExp(`^ca-${dataset.chamber}-[a-z0-9-]+$`));
      assert(
        record.name && record.sourceName && !/vacant/i.test(record.name),
        'Member name is missing or vacant',
      );
      assert(
        ['Democratic', 'Republican', 'Independent'].includes(record.party),
        'Unexpected party; review source',
      );
    }
  }
  return dataset;
}
