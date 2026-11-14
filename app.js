const partyNames = { D: 'Democratic', R: 'Republican', I: 'Independent' };
const controls = Object.fromEntries(['search', 'chamber', 'party', 'year', 'sort'].map(id => [id, document.getElementById(id)]));
const results = document.getElementById('results');
const status = document.getElementById('status');
let legislators = [];

function normalize(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
}

function createMember(member) {
  const card = document.createElement('article');
  card.className = 'member';
  const top = document.createElement('div');
  top.className = 'member-top';
  const chamber = document.createElement('span');
  chamber.className = 'chamber';
  chamber.textContent = member.office === 'house' ? 'House of Representatives' : 'Senate';
  const party = document.createElement('span');
  party.className = `party party-${member.party}`;
  party.textContent = partyNames[member.party] || member.party;
  top.append(chamber, party);
  const name = document.createElement('h2');
  name.textContent = member.name;
  const details = document.createElement('dl');
  const label = document.createElement('dt');
  label.textContent = 'Next regular election';
  const year = document.createElement('dd');
  year.textContent = member.next_election_year;
  details.append(label, year);
  card.append(top, name, details);
  return card;
}

function render() {
  const query = normalize(controls.search.value);
  const matches = legislators.filter(member =>
    normalize(member.name).includes(query) &&
    (!controls.chamber.value || member.office === controls.chamber.value) &&
    (!controls.party.value || member.party === controls.party.value) &&
    (!controls.year.value || String(member.next_election_year) === controls.year.value)
  ).sort((first, second) => {
    const yearDifference = controls.sort.value === 'election' ? first.next_election_year - second.next_election_year : 0;
    return yearDifference || first.name.localeCompare(second.name);
  });
  results.replaceChildren(...matches.map(createMember));
  status.textContent = `${matches.length} of ${legislators.length} members`;
  document.getElementById('empty').hidden = matches.length !== 0;
}

async function load() {
  try {
    const response = await fetch('./db.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.legislators)) throw new Error('Invalid database');
    legislators = data.legislators;
    const years = [...new Set(legislators.map(member => member.next_election_year))].sort((first, second) => first - second);
    for (const year of years) {
      const option = document.createElement('option');
      option.value = String(year);
      option.textContent = year;
      controls.year.append(option);
    }
    render();
  } catch (error) {
    status.textContent = 'Directory unavailable';
    document.getElementById('error').hidden = false;
    for (const control of Object.values(controls)) control.disabled = true;
    document.getElementById('reset').disabled = true;
  } finally {
    results.setAttribute('aria-busy', 'false');
  }
}

document.getElementById('filters').addEventListener('submit', event => event.preventDefault());
for (const control of Object.values(controls)) control.addEventListener('input', render);
document.getElementById('reset').addEventListener('click', () => {
  document.getElementById('filters').reset();
  render();
  controls.search.focus();
});
load();
