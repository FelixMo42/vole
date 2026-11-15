const partyNames = { D: 'Democratic', R: 'Republican', I: 'Independent' };
const controls = Object.fromEntries(['search', 'chamber', 'party', 'year', 'sort', 'state', 'coverage', 'bill'].map(id => [id, document.getElementById(id)]));
const results = document.getElementById('results');
const status = document.getElementById('status');
let legislators = [];
let dataset;
let assessments = new Map();

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function scorecard(member, assessment) {
  const section = node('details', undefined, 'scorecard');
  section.append(node('summary', 'View actions & legislative requests'));
  section.addEventListener('toggle', () => {
    if (!section.open || section.dataset.loaded) return;
    section.dataset.loaded = 'true';
    section.append(node('p', `Research incomplete · ${member.id}. Current means an action within ${dataset.freshness_days} days.`, 'fine-print'));
    for (const finding of assessment.findings) {
      const priority = node('section', undefined, 'priority');
      priority.append(node('h3', finding.priority.title));
      const label = { support: 'Supportive legislative action', oppose: 'Opposing legislative action', mixed: 'Partial / mixed legislative actions', unknown: finding.evidence.length ? 'No recent qualifying action' : 'No legislative action documented' }[finding.position];
      const weight = 100 * finding.priority.weight / dataset.priorities.reduce((sum, priority) => sum + priority.weight, 0);
      priority.append(node('p', `${label} · ${weight.toFixed(1)}% rubric weight`, 'finding'));
      priority.append(node('p', finding.priority.description));
      for (const bill of dataset.bills.filter(bill => bill.priority === finding.priority.id && bill.chamber === member.office)) {
        const link = node('a', `${bill.number} · ${bill.title}`);
        link.href = bill.url;
        priority.append(link, node('p', `Introduced ${bill.introduced_on}. ${bill.source_scope}`, 'fine-print'));
      }
      for (const entry of finding.evidence) {
        const evidence = node('div', undefined, 'evidence');
        const link = node('a', entry.source_title);
        link.href = entry.url;
        evidence.append(link, node('p', `${entry.date} · ${entry.action} · ${entry.position} · reviewed ${entry.reviewed_on}${finding.current.includes(entry) ? '' : ' · Excluded from recent-action score'}`, 'fine-print'), node('p', entry.summary));
        if (entry.action === 'vote') {
          const rollCall = node('a', `Recorded vote: ${entry.vote} · ${entry.vote_question}`);
          rollCall.href = entry.roll_call_url;
          evidence.append(rollCall);
        }
        priority.append(evidence);
      }
      priority.append(node('h4', 'Ask for this action'), node('p', Scorecards.actionRequest(member, finding, dataset)));
      const draft = node('details');
      draft.append(node('summary', 'Prepare a request'));
      const message = node('textarea');
      message.value = Scorecards.request(member, finding, dataset);
      message.readOnly = true;
      message.rows = 9;
      message.setAttribute('aria-label', `${finding.priority.title} request to ${member.name}`);
      const copy = node('button', 'Copy request');
      copy.type = 'button';
      const feedback = node('span', '', 'fine-print');
      feedback.setAttribute('role', 'status');
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(message.value);
          feedback.textContent = 'Copied. Review and personalize before sending.';
        } catch {
          message.focus();
          message.select();
          feedback.textContent = 'Select and copy the text manually.';
        }
      });
      draft.append(message, copy, feedback);
      priority.append(draft);
      section.append(priority);
    }
    const contact = node('a', 'Find official contact information');
    contact.href = member.office === 'house' ? 'https://www.house.gov/representatives' : 'https://www.senate.gov/senators/senators-contact.htm';
    section.append(contact, node('p', 'Requests are editorial policy proposals. Check current legislative opportunities with the office. Nothing is sent automatically.', 'fine-print'));
  });
  return section;
}

function normalize(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
}

function recordedActions(assessment) {
  return assessment.findings.flatMap(finding => finding.evidence).sort((first, second) => second.date.localeCompare(first.date));
}

function actionSummary(assessment) {
  const section = node('section', undefined, 'action-summary');
  const actions = recordedActions(assessment);
  section.append(node('h3', `${actions.length} recorded legislative ${actions.length === 1 ? 'action' : 'actions'}`));
  if (!actions.length) {
    section.append(node('p', 'No actions researched yet. This is a gap in our data, not evidence of inaction.', 'fine-print'));
    return section;
  }
  const list = node('ul', undefined, 'action-list');
  for (const entry of actions.slice(0, 3)) {
    const bill = dataset.bills.find(bill => bill.id === entry.bill_id);
    const item = node('li');
    const verb = entry.action === 'sponsor' ? 'Sponsored' : entry.action === 'cosponsor' ? 'Cosponsored' : `Voted ${entry.vote}`;
    const source = node('a', `${verb} ${bill.number}`);
    source.href = entry.action === 'vote' ? entry.roll_call_url : entry.url;
    const current = assessment.findings.some(finding => finding.current.includes(entry));
    item.append(source, node('p', bill.title), node('p', `${entry.date} · ${entry.position === 'mixed' ? 'Partial / mixed alignment' : entry.position === 'support' ? 'Supportive action' : 'Opposing action'}${current ? '' : ' · Historical'}`, 'fine-print'));
    list.append(item);
  }
  section.append(list);
  if (actions.length > 3) section.append(node('p', `${actions.length - 3} more in the full scorecard below.`, 'fine-print'));
  return section;
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
  const location = node('p', `${member.state}${member.district ? ` · ${member.district}` : ''}`, 'fine-print');
  const assessment = assessments.get(member.id);
  const details = document.createElement('dl');
  const label = document.createElement('dt');
  label.textContent = 'Next regular election';
  const year = document.createElement('dd');
  year.textContent = member.next_election_year;
  details.append(label, year);
  card.id = member.id;
  const permalink = node('a', 'Link to this member', 'fine-print');
  permalink.href = `#${member.id}`;
  permalink.addEventListener('click', () => {
    controls.search.value = member.name;
    for (const id of ['chamber', 'party', 'year', 'state', 'coverage', 'bill']) controls[id].value = '';
    render();
    document.getElementById(member.id).querySelector('details').open = true;
  });
  card.append(top, name, location, actionSummary(assessment), details, scorecard(member, assessment), permalink);
  return card;
}

function render() {
  const query = normalize(controls.search.value);
  const matches = legislators.filter(member =>
    normalize(member.name).includes(query) &&
    (!controls.chamber.value || member.office === controls.chamber.value) &&
    (!controls.party.value || member.party === controls.party.value) &&
    (!controls.state.value || member.state === controls.state.value) &&
    (!controls.bill.value || recordedActions(assessments.get(member.id)).some(entry => controls.bill.value === 'superintelligence-ban' ? entry.priority === 'superintelligence-ban' : entry.bill_id === controls.bill.value)) &&
    (!controls.coverage.value || (controls.coverage.value === 'current' ? assessments.get(member.id).coverage > 0 : controls.coverage.value === 'historical' ? assessments.get(member.id).findings.some(finding => finding.evidence.length > finding.current.length) : assessments.get(member.id).overall !== null)) &&
    (!controls.year.value || String(member.next_election_year) === controls.year.value)
  ).sort((first, second) => {
    const difference = controls.sort.value === 'election' ? first.next_election_year - second.next_election_year
      : controls.sort.value === 'score' ? (assessments.get(second.id).overall ?? -1) - (assessments.get(first.id).overall ?? -1)
      : controls.sort.value === 'coverage' ? assessments.get(second.id).coverage - assessments.get(first.id).coverage : 0;
    return difference || first.name.localeCompare(second.name);
  });
  results.replaceChildren(...matches.map(createMember));
  status.textContent = `${matches.length} of ${legislators.length} members`;
  document.getElementById('empty').hidden = matches.length !== 0;
}

async function load() {
  try {
    const [data, scoreData] = await Promise.all(['./db.json', './scorecards.json'].map(async url => {
      const response = await fetch(url, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
      try {
        return await response.json();
      } catch {
        throw new Error(`${url}: invalid JSON`);
      }
    }));
    if (!Array.isArray(data.legislators)) throw new Error('Invalid database');
    Scorecards.validate(data.legislators, scoreData);
    legislators = data.legislators;
    dataset = scoreData;
    assessments = new Map(legislators.map(member => [member.id, Scorecards.assess(member.id, dataset)]));
    const documented = [...assessments.values()].filter(assessment => assessment.coverage > 0).length;
    document.getElementById('research-status').textContent = `Research incomplete: ${documented} of ${legislators.length} members have current evidence in this seed dataset. ${dataset.evidence.length} cited actions reviewed ${dataset.reviewed_on}. Missing evidence means unknown, not opposition.`;
    for (const bill of dataset.bills) {
      const option = node('option', `${bill.number} · ${bill.title}`);
      option.value = bill.id;
      controls.bill.append(option);
    }
    for (const state of [...new Set(legislators.map(member => member.state))].sort()) {
      const option = node('option', state);
      option.value = state;
      controls.state.append(option);
    }
    const selected = legislators.find(member => `#${member.id}` === location.hash);
    if (selected) controls.search.value = selected.name;
    const years = [...new Set(legislators.map(member => member.next_election_year))].sort((first, second) => first - second);
    for (const year of years) {
      const option = document.createElement('option');
      option.value = String(year);
      option.textContent = year;
      controls.year.append(option);
    }
    render();
    if (selected) document.getElementById(selected.id).querySelector('details').open = true;
  } catch (error) {
    status.textContent = 'Directory unavailable';
    document.getElementById('research-status').textContent = 'Research data unavailable. Scores and policy requests could not be loaded.';
    document.getElementById('error').hidden = false;
    document.getElementById('error').textContent = `We couldn’t load the directory. ${error.message || 'Check your connection and reload the page.'}`;
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
