const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const CallsToAction = require('../actions-data.js');
const Scorecards = require('../scoring.js');
const catalog = require('../calls-to-action.json');
const research = require('../scorecards.json');
const { legislators: roster } = require('../db.json');
const copy = value => JSON.parse(JSON.stringify(value));
const ban = catalog.actions.find(action => action.id === 'superintelligence-ban');

test('published catalog joins valid bills and roster identities', () => {
  CallsToAction.validate(catalog, research);
  assert.equal(catalog.actions.length, 3);
  assert.equal(CallsToAction.memberStatus(ban, 'S000033', research, '2026-11-15').legislative, 'support');
  assert.equal(CallsToAction.memberStatus(ban, 'C001088', research, '2026-11-15').legislative, 'unknown');
  assert.equal(CallsToAction.memberStatus(ban, 'S000033', research, '2026-01-01').legislative, 'unknown');
});

test('catalog rejects mismatched and duplicate bills; unscored goals work', () => {
  for (const change of [
    draft => { draft.actions[0].bill_ids = ['S1792']; },
    draft => { draft.actions.push(copy(draft.actions[0])); },
    draft => { draft.actions[0].bill_ids.push(draft.actions[0].bill_ids[0]); }
  ]) { const draft = copy(catalog); change(draft); assert.throws(() => CallsToAction.validate(draft, research)); }
  const draft = copy(catalog);
  draft.actions.push({ id: 'new-goal', title: 'New goal', description: 'A policy goal.', request: 'Introduce legislation.', lifecycle: 'active', priority_id: null, bill_ids: [] });
  CallsToAction.validate(draft, research);
  assert.equal(CallsToAction.memberStatus(draft.actions.at(-1), roster[0].id, research).legislative, 'unknown');
});

test('requests distinguish sponsors, chambers and expired legislation', () => {
  const sanders = roster.find(member => member.id === 'S000033');
  const coons = roster.find(member => member.id === 'C001088');
  const house = roster.find(member => member.office === 'house' && !research.evidence.some(entry => entry.bill_id === 'HR10538' && entry.member_id === member.id));
  assert.match(CallsToAction.request(ban, sanders, research, '2026-11-15'), /requesting a committee hearing/);
  assert.doesNotMatch(CallsToAction.request(ban, sanders, research, '2026-11-15'), /become an official cosponsor/);
  assert.match(CallsToAction.request(ban, coons, research, '2026-11-15'), /cosponsor of S\. 5493/);
  assert.match(CallsToAction.request(ban, house, research, '2026-11-15'), /cosponsor of H\.R\. 10538/);
  const expired = CallsToAction.request(ban, sanders, research, '2027-02-01');
  assert.match(expired, /successor legislation/);
  assert.doesNotMatch(expired, /become an official cosponsor/);
});

function element(tag = '') {
  return { tag, value: '', hidden: false, children: [], events: {}, attributes: {},
    append(...items) { this.children.push(...items); if (this.tag === 'select' && !this.value) this.value = this.children[0]?.value || ''; },
    replaceChildren(...items) { this.children = []; this.value = ''; this.append(...items); },
    setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener(name, handler) { this.events[name] = handler; },
    focus() {}, select() {}, click() {},
    querySelectorAll() { return this.children.flatMap(child => child.children || []).filter(child => child.tag === 'input' && child.checked); }
  };
}

async function boot(page, { fail = false, storageFails = false, saved } = {}) {
  const html = fs.readFileSync(require.resolve(`../${page}.html`), 'utf8');
  const ids = Object.fromEntries([...html.matchAll(/<(\w+)[^>]*\bid="([^"]+)"/g)].map(([, tag, id]) => [id, element(tag)]));
  for (const [, id, value, text] of html.matchAll(/<select id="([^"]+)"[^>]*>\s*<option value="([^"]*)">([^<]*)<\/option>/g)) {
    const item = element('option'); item.value = value; item.textContent = text; ids[id].append(item);
  }
  const storage = new Map(saved ? [['congress-calls-to-action-draft-v1', JSON.stringify(saved)]] : []);
  const location = { hash: '#superintelligence-ban' };
  const events = {};
  const context = vm.createContext({ CallsToAction, Scorecards, URL, Blob, crypto: require('node:crypto').webcrypto, setTimeout: fn => fn(), location,
    window: { addEventListener: (name, handler) => { events[name] = handler; } },
    navigator: { clipboard: { writeText: async () => {} } },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => { if (storageFails) throw Error('Storage blocked'); storage.set(key, value); } },
    document: { getElementById: id => ids[id], createElement: element, createTextNode: text => ({ textContent: text }) },
    fetch: async path => ({ ok: !fail, json: async () => copy(path === 'db.json' ? { legislators: roster } : path === 'scorecards.json' ? research : catalog) })
  });
  vm.runInContext(fs.readFileSync(require.resolve(`../${page}.js`), 'utf8'), context);
  await new Promise(resolve => setImmediate(resolve));
  return { ids, storage, context, location, events };
}

test('explorer deep links, filters records and states, searches goals and paginates', async () => {
  const { ids, location, events } = await boot('actions');
  assert.equal(ids.explorer.hidden, false);
  assert.equal(ids['action-title'].textContent, ban.title);
  assert.equal(ids['action-members'].children.length, 30);
  ids['more-members'].events.click();
  assert.equal(ids['action-members'].children.length, 60);
  ids['member-record'].value = 'support'; ids['member-record'].events.input();
  assert.equal(ids['action-members'].children.length, 11);
  const supportLabels = ids['action-members'].children.map(row => row.children[0].children[1].children[0].textContent);
  assert(supportLabels.includes('Sponsored S. 5493'));
  assert(supportLabels.includes('Cosponsored H.R. 10538'));
  assert(!supportLabels.includes('Supportive action'));
  ids['member-state'].value = 'VT'; ids['member-state'].events.input();
  assert.equal(ids['action-members'].children.length, 1);
  ids['action-search'].value = 'S. 5493'; ids['action-search'].events.input();
  assert.equal(ids['action-list'].children.length, 1);
  location.hash = '#evaluations'; events.hashchange();
  assert.equal(ids['action-title'].textContent, 'Safety evaluations & transparency');
  ids['member-state'].value = 'ZZ'; ids['member-state'].events.input();
  assert.match(ids['action-members'].children[0].textContent, /No politicians/);
});

test('explorer fails visibly on missing data', async () => {
  const { ids } = await boot('actions', { fail: true });
  assert.equal(ids.explorer.hidden, true);
  assert.match(ids['load-status'].textContent, /could not be loaded/);
});

test('editor creates an action and restores drafts', async () => {
  const { ids, storage } = await boot('manage');
  assert.equal(ids.manager.hidden, false);
  ids['new-action'].events.click();
  for (const [key, value] of Object.entries({ id: 'new-goal', title: 'A new goal', description: 'Description', request: 'Introduce legislation', lifecycle: 'active' })) ids[`edit-${key}`].value = value;
  ids['action-form'].events.submit({ preventDefault() {} });
  let draft = JSON.parse(storage.get('congress-calls-to-action-draft-v1'));
  assert.equal(draft.catalog.actions.length, 4);
  assert.equal(draft.catalog.actions.at(-1).priority_id, null);
  const restored = await boot('manage', { saved: draft });
  assert.equal(restored.ids['manage-action'].children.length, 4);
  assert.match(restored.ids['manager-status'].textContent, /Restored/);
});

test('editor saves sourced evidence shared by scorecards, and preserves download fallback', async () => {
  const { ids, storage } = await boot('manage');
  ids['manage-action'].value = ban.id; ids['manage-action'].events.change();
  ids['edit-member'].value = 'C001088'; ids['edit-member'].events.change();
  const values = { bill: 'S5493', action: 'cosponsor', position: 'support', date: '2026-11-14', reviewed: '2026-11-14', title: 'Synthetic test source', url: 'https://example.org/official-record', summary: 'Synthetic test only; not published.' };
  for (const [key, value] of Object.entries(values)) ids[`evidence-${key}`].value = value;
  ids['evidence-form'].events.submit({ preventDefault() {} });
  const draft = JSON.parse(storage.get('congress-calls-to-action-draft-v1'));
  assert.equal(draft.research.evidence.length, research.evidence.length + 1);
  assert.equal(CallsToAction.memberStatus(ban, 'C001088', draft.research).legislative, 'support');
  Scorecards.validate(roster, draft.research);
  const fallback = await boot('manage', { storageFails: true });
  fallback.ids['edit-title'].value = 'Updated locally';
  fallback.ids['action-form'].events.submit({ preventDefault() {} });
  assert.match(fallback.ids['manager-status'].textContent, /download now/);
});

test('editor imports valid catalogs, rejects broken references, and exports validated files', async () => {
  const { ids, storage } = await boot('manage');
  const draft = copy(catalog); draft.actions[0].title = 'Imported title';
  const input = { files: [{ text: async () => JSON.stringify(draft) }], value: 'file' };
  await ids['import-catalog'].events.change({ target: input });
  assert.equal(ids['edit-title'].value, 'Imported title');
  const before = storage.get('congress-calls-to-action-draft-v1');
  draft.actions[0].bill_ids = ['NONEXISTENT'];
  await ids['import-catalog'].events.change({ target: { files: [{ text: async () => JSON.stringify(draft) }] } });
  assert.match(ids['manager-status'].textContent, /Import rejected/);
  assert.equal(storage.get('congress-calls-to-action-draft-v1'), before);
  ids['export-catalog'].events.click();
  assert.match(ids['manager-status'].textContent, /Downloaded calls-to-action.json/);
  ids['export-research'].events.click();
  assert.match(ids['manager-status'].textContent, /Downloaded scorecards.json/);
});
