const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Scorecards = require('../scoring.js');
const roster = require('../db.json');
const dataset = require('../scorecards.json');

function element(tag = '') {
  return { tag, value: '', hidden: true, dataset: {}, children: [], events: {},
    append(...items) { this.children.push(...items); },
    replaceChildren(...items) { this.children = items; },
    setAttribute() {}, addEventListener(name, handler) { this.events[name] = handler; },
    focus() {}, select() {}, querySelector(tagName) { return this.children.find(child => child.tag === tagName); }
  };
}

async function boot({ fail = false, hash = '', clipboardFails = false, invalidJson = false } = {}) {
  const html = fs.readFileSync(require.resolve('../index.html'), 'utf8');
  const ids = Object.fromEntries([...html.matchAll(/<(\w+)[^>]*\bid="([^"]+)"/g)].map(([, tag, id]) => [id, element(tag)]));
  let copied;
  ids.sort.value = 'name';
  ids.filters.reset = () => { for (const id of ['search', 'chamber', 'party', 'year', 'state', 'coverage', 'bill']) ids[id].value = ''; ids.sort.value = 'name'; };
  const context = vm.createContext({
    Scorecards, location: { hash }, navigator: { clipboard: { writeText: async text => { if (clipboardFails) throw Error('Unavailable'); copied = text; } } },
    document: { createElement: element, getElementById: id => ids[id] || ids.results.children.find(card => card.id === id) },
    fetch: async url => ({ ok: !fail, status: fail ? 404 : 200, json: async () => { if (invalidJson && url === './scorecards.json') throw new SyntaxError('Invalid JSON'); return url === './db.json' ? roster : dataset; } })
  });
  vm.runInContext(fs.readFileSync(require.resolve('../app.js'), 'utf8'), context);
  await new Promise(resolve => setImmediate(resolve));
  return { ids, copied: () => copied };
}

test('full roster, House option, combined filters, search, empty results and reset', async () => {
  const { ids } = await boot();
  assert.equal(ids.results.children.length, 539);
  const html = fs.readFileSync(require.resolve('../index.html'), 'utf8');
  assert(html.includes('<option value="house">House</option>'));
  assert(!/<\/option\s+value/.test(html));
  ids.chamber.value = 'house'; ids.chamber.events.input();
  assert.equal(ids.results.children.length, 439);
  ids.state.value = 'CA'; ids.party.value = 'D'; ids.party.events.input();
  assert.equal(ids.results.children.length, roster.legislators.filter(member => member.office === 'house' && member.state === 'CA' && member.party === 'D').length);
  ids.reset.events.click(); ids.search.value = 'hernandez'; ids.search.events.input();
  assert(ids.results.children.some(card => card.children.some(child => child.textContent?.includes('Hernández'))));
  ids.search.value = 'no-such-member'; ids.search.events.input();
  assert.equal(ids.empty.hidden, false);
  ids.reset.events.click();
  assert.equal(ids.results.children.length, 539);
  ids.coverage.value = 'rated'; ids.coverage.events.input();
  assert.equal(ids.results.children.length, 0);
});

test('scorecard lazily reveals three priorities, citations and copyable requests', async () => {
  const { ids, copied } = await boot({ hash: '#C001088' });
  assert.equal(ids.results.children.length, 1);
  const details = ids.results.children[0].querySelector('details');
  assert.equal(details.open, true);
  details.events.toggle();
  const priorities = details.children.filter(child => child.tag === 'section');
  assert.equal(priorities.length, 3);
  assert(priorities[0].children.some(child => child.className === 'evidence'));
  const draft = priorities[0].querySelector('details');
  await draft.querySelector('button').events.click();
  assert(copied().includes('Senator Christopher A. Coons'));
  const count = details.children.length;
  details.events.toggle();
  assert.equal(details.children.length, count);
});

test('ban scorecards show actual sponsorship, bill links and a concrete follow-up', async () => {
  const { ids, copied } = await boot({ hash: '#S000033' });
  const details = ids.results.children[0].querySelector('details');
  details.events.toggle();
  const ban = details.children.filter(child => child.tag === 'section').at(-1);
  assert(ban.children.some(child => child.tag === 'a' && child.textContent.includes('S. 5493')));
  assert(ban.children.some(child => child.className === 'finding' && child.textContent.includes('Supportive legislative action')));
  await ban.querySelector('details').querySelector('button').events.click();
  assert(copied().includes('requesting a committee hearing on S. 5493'));
});

test('clipboard failure retains a selectable draft and reports fallback', async () => {
  const { ids } = await boot({ hash: '#C001088', clipboardFails: true });
  const details = ids.results.children[0].querySelector('details');
  details.events.toggle();
  const draft = details.children.find(child => child.tag === 'section').querySelector('details');
  await draft.querySelector('button').events.click();
  assert(draft.querySelector('span').textContent.includes('manually'));
});

test('load failure disables controls and explains research availability', async () => {
  const { ids } = await boot({ fail: true });
  assert.equal(ids.error.hidden, false);
  assert.equal(ids.search.disabled, true);
  assert(ids['research-status'].textContent.includes('unavailable'));
  assert.match(ids.error.textContent, /db\.json: HTTP 404/);
});

test('load errors identify invalid research JSON', async () => {
  const { ids } = await boot({ invalidJson: true });
  assert.equal(ids.error.hidden, false);
  assert.match(ids.error.textContent, /scorecards\.json: invalid JSON/);
});

test('bill filter combines with chamber and resets cleanly', async () => {
  const { ids } = await boot();
  ids.bill.value = 'superintelligence-ban';
  ids.bill.events.input();
  assert.equal(ids.bill.value, 'superintelligence-ban');
  assert.equal(ids.results.children.length, 11);
  ids.chamber.value = 'house'; ids.chamber.events.input();
  assert.equal(ids.results.children.length, 10);
  ids.chamber.value = 'senate'; ids.chamber.events.input();
  assert.equal(ids.results.children.length, 1);
  ids.reset.events.click();
  assert.equal(ids.bill.value, '');
  assert.equal(ids.results.children.length, 539);
  ids.bill.value = 'HR3460'; ids.bill.events.input();
  assert.equal(ids.results.children.length, 2);
});

test('main cards show action sources and avoid implying unknown members did nothing', async () => {
  const { ids } = await boot({ hash: '#S000033' });
  const summary = ids.results.children[0].children.find(child => child.className === 'action-summary');
  assert.equal(summary.querySelector('h3').textContent, '1 recorded legislative action');
  const action = summary.querySelector('ul').children[0];
  assert.equal(action.querySelector('a').textContent, 'Sponsored S. 5493');
  assert(action.querySelector('a').href.includes('govinfo.gov'));
  ids.reset.events.click();
  const unknown = ids.results.children.find(card => !dataset.evidence.some(entry => entry.member_id === card.id));
  const unknownSummary = unknown.children.find(child => child.className === 'action-summary');
  assert(unknownSummary.querySelector('p').textContent.includes('not evidence of inaction'));
});
