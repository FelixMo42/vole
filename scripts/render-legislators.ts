import { readFile } from 'node:fs/promises';
import type { LegislatorDataset } from '../data/types.ts';

const datasets = {
  senate: 'california-senators.json',
  assembly: 'california-assembly-members.json',
};

function escapeHtml(value: string | number) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character]!;
  });
}

export async function renderLegislatorList(chamber: keyof typeof datasets) {
  const dataset: LegislatorDataset = JSON.parse(
    await readFile(
      new URL(`../data/${datasets[chamber]}`, import.meta.url),
      'utf8',
    ),
  );
  const rows = dataset.members
    .map((member) => {
      const searchable = [
        member.name,
        member.sourceName,
        `district ${member.district}`,
        member.party,
        `election ${member.nextElectionYear}`,
        ...(member.counties ?? []),
      ].join(' ');
      return `<tr data-member-row data-district="${member.district}" data-election-year="${member.nextElectionYear}" data-search="${escapeHtml(searchable)}">
      <td><a href="${escapeHtml(member.profileUrl)}">${escapeHtml(member.name)}</a></td>
      <td>${member.district}</td>
      <td><span class="member-party-full">${escapeHtml(member.party)}</span><abbr class="member-mobile-label" title="${escapeHtml(member.party)}" aria-label="${escapeHtml(member.party)}">${member.party === 'Democratic' ? 'Dem.' : member.party === 'Republican' ? 'Rep.' : 'Ind.'}</abbr></td>
      <td>${member.nextElectionYear}</td>
    </tr>`;
    })
    .join('\n');
  const checked = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeZone: 'America/Los_Angeles',
  }).format(new Date(dataset.retrievedAt));
  const vacancies = dataset.vacancies.length
    ? `<p class="member-meta">Vacant ${dataset.vacancies.length === 1 ? 'district' : 'districts'}: ${dataset.vacancies.map((seat) => seat.district).join(', ')}.</p>`
    : '';
  const hint =
    chamber === 'assembly'
      ? 'Name, district, party, county, or election year'
      : 'Name, district, party, or election year';
  return `<section class="member-directory" data-member-directory aria-label="${escapeHtml(dataset.title)} members">
    <div class="member-search" hidden>
      <label for="${chamber}-search">Search members</label>
      <div class="search-controls">
        <input id="${chamber}-search" type="search" placeholder="${hint}" aria-describedby="${chamber}-results" autocomplete="off">
        <button type="button" data-clear-search disabled>Clear</button>
      </div>
    </div>
    <p id="${chamber}-results" class="member-results" role="status" aria-live="polite" aria-atomic="true" data-member-count>${dataset.members.length} of ${dataset.members.length} members</p>
    <p data-no-members hidden>No members match your search.</p>
    <table class="members-table">
      <caption class="visually-hidden">${escapeHtml(dataset.title)} members</caption>
      <thead><tr><th scope="col">Name</th><th scope="col" aria-label="District"><span class="member-desktop-label">District</span><abbr class="member-mobile-label" title="District">Dist.</abbr></th><th scope="col">Party</th><th scope="col" aria-label="Next election"><span class="member-desktop-label">Next election</span><abbr class="member-mobile-label" title="Next election year">Year</abbr></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${vacancies}
    <p class="member-meta">Next election is the seat's next regular election year, regardless of whether the current member runs. Special elections are excluded.</p>
    <p class="member-meta">Roster checked ${checked}. <a href="${escapeHtml(dataset.source.url)}">Official ${chamber === 'senate' ? 'Senate' : 'Assembly'} roster</a>.</p>
  </section>`;
}
