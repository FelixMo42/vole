const field = id => document.getElementById(id);
const option = (value, text) => { const item = document.createElement('option'); item.value = value; item.textContent = text; return item; };
const draftKey = 'congress-calls-to-action-draft-v1';
let catalog, research, roster, editingId = null;
const today = () => new Date().toISOString().slice(0, 10);
const clone = value => JSON.parse(JSON.stringify(value));
function report(message) { field('manager-status').textContent = message; }
function validate(nextCatalog, nextResearch) { Scorecards.validate(roster, nextResearch); CallsToAction.validate(nextCatalog, nextResearch); }
function commit(nextCatalog, nextResearch, message) {
  validate(nextCatalog, nextResearch);
  catalog = { version: nextCatalog.version, actions: nextCatalog.actions }; research = nextResearch;
  try { localStorage.setItem(draftKey, JSON.stringify({ catalog, research })); report(`${message} Saved in this browser. Download the files to publish.`); }
  catch { report(`${message} Browser storage is unavailable; download now to keep these changes.`); }
}
function attempt(work) { try { work(); } catch (error) { report(error.message); } }
function currentAction() { return catalog.actions.find(action => action.id === editingId); }
function refreshActions(id) {
  const priority = field('edit-priority').value;
  field('edit-priority').replaceChildren(option('', 'No rubric link'), ...research.priorities.map(item => option(item.id, item.title)));
  field('edit-priority').value = priority;
  field('manage-action').replaceChildren(...catalog.actions.map(action => option(action.id, `${action.title} · ${action.lifecycle}`)));
  field('catalog-summary').textContent = `${catalog.actions.length} calls to action · ${research.evidence.length} legislative records`;
  field('manage-action').value = id || catalog.actions[0]?.id || '';
  editAction(field('manage-action').value);
}
function editAction(id) {
  editingId = id || null;
  const action = currentAction();
  for (const key of ['id', 'title', 'description', 'request', 'lifecycle']) field(`edit-${key}`).value = action?.[key] || (key === 'lifecycle' ? 'active' : '');
  field('edit-id').readOnly = !!action;
  field('edit-priority').value = action?.priority_id || '';
  field('preview-action').href = `actions.html${action ? `#${action.id}` : ''}`;
  field('politician-editor').hidden = !action;
  renderBills(action?.bill_ids || []);
  loadMember();
}
function renderBills(selected) {
  field('edit-bills').replaceChildren(...research.bills.filter(bill => bill.priority === field('edit-priority').value).map(bill => {
    const label = document.createElement('label'); label.className = 'checkbox-label';
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.value = bill.id; checkbox.checked = selected.includes(bill.id);
    label.append(checkbox, document.createTextNode(`${bill.number} · ${bill.title}`)); return label;
  }));
}
function memberOptions() {
  const previous = field('edit-member').value;
  const query = field('politician-search').value.trim().toLocaleLowerCase();
  const matches = roster.filter(member => `${member.name} ${member.state} ${member.id}`.toLocaleLowerCase().includes(query));
  field('edit-member').replaceChildren(...matches.map(member => option(member.id, `${member.name} · ${member.office} · ${member.state} · ${member.id}`)));
  if (matches.some(member => member.id === previous)) field('edit-member').value = previous;
  loadMember();
}
function loadMember() {
  const action = currentAction(), member = roster?.find(person => person.id === field('edit-member').value);
  field('evidence-form').hidden = !member;
  if (!action || !member) { field('current-record').textContent = 'Choose a saved action and a matching politician.'; return; }
  const state = CallsToAction.memberStatus(action, member.id, research);
  field('current-record').textContent = `${state.evidence.length} sourced legislative records. These are draft values.`;
  field('edit-evidence').replaceChildren(option('', 'Add a legislative record'), ...state.evidence.map(entry => option(entry.id, `${entry.date} · ${entry.bill_id} · ${entry.action} · ${entry.position}`)));
  field('evidence-bill').replaceChildren(...research.bills.filter(bill => action.bill_ids.includes(bill.id)).map(bill => option(bill.id, `${bill.number} · ${bill.chamber}`)));
  loadEvidence();
}
function loadEvidence() {
  const entry = research.evidence.find(item => item.id === field('edit-evidence').value);
  for (const [id, key, fallback] of [['action', 'action', 'sponsor'], ['position', 'position', 'support'], ['date', 'date', today()], ['reviewed', 'reviewed_on', today()], ['title', 'source_title', ''], ['url', 'url', ''], ['summary', 'summary', ''], ['vote', 'vote', 'yea'], ['question', 'vote_question', ''], ['rollcall', 'roll_call_url', '']]) field(`evidence-${id}`).value = entry?.[key] || fallback;
  if (entry) field('evidence-bill').value = entry.bill_id;
  field('remove-evidence').disabled = !entry;
  voteFields();
}
function voteFields() { field('vote-fields').hidden = field('evidence-action').value !== 'vote'; }
function download(filename, data) {
  validate(catalog, research);
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  report(`Downloaded ${filename}. Replace the project file, run tests, and redeploy to publish.`);
}

async function bootManager() {
  try {
    [catalog, research, { legislators: roster }] = await Promise.all(['calls-to-action.json', 'scorecards.json', 'db.json'].map(async path => { const response = await fetch(path); if (!response.ok) throw Error('Could not load published files.'); return response.json(); }));
    validate(catalog, research);
    report('Published files loaded.');
    try { const saved = localStorage.getItem(draftKey); if (saved) { const draft = JSON.parse(saved); validate(draft.catalog, draft.research); catalog = { version: draft.catalog.version, actions: draft.catalog.actions }; research = draft.research; report('Restored local draft. The public pages still show published files.'); } }
    catch { report('Stored draft is unavailable or invalid. Published files loaded; download any work before leaving.'); }
    memberOptions(); refreshActions(); field('manager').hidden = false;
    field('manage-action').addEventListener('change', () => editAction(field('manage-action').value));
    field('new-action').addEventListener('click', () => { field('manage-action').value = ''; editAction(null); field('edit-id').focus(); });
    field('edit-priority').addEventListener('change', () => renderBills([]));
    field('politician-search').addEventListener('input', memberOptions);
    field('edit-member').addEventListener('change', loadMember);
    field('edit-evidence').addEventListener('change', loadEvidence);
    field('evidence-action').addEventListener('change', voteFields);
    field('action-form').addEventListener('submit', event => { event.preventDefault(); attempt(() => {
      const action = Object.fromEntries(['id', 'title', 'description', 'request', 'lifecycle'].map(key => [key, field(`edit-${key}`).value.trim()]));
      action.priority_id = field('edit-priority').value || null;
      action.bill_ids = [...field('edit-bills').querySelectorAll('input:checked')].map(input => input.value);
      const next = clone(catalog);
      if (editingId) next.actions[next.actions.findIndex(item => item.id === editingId)] = action;
      else next.actions.push(action);
      commit(next, research, 'Action saved.'); refreshActions(action.id);
    }); });
    field('evidence-form').addEventListener('submit', event => { event.preventDefault(); attempt(() => {
      const bill = research.bills.find(item => item.id === field('evidence-bill').value); if (!bill) throw Error('Link a registered bill to this action first.');
      const next = clone(research), selected = field('edit-evidence').value;
      const entry = { id: selected || `cta-${crypto.randomUUID()}`, member_id: field('edit-member').value, bill_id: bill.id, priority: bill.priority, action: field('evidence-action').value, position: field('evidence-position').value, date: field('evidence-date').value, reviewed_on: field('evidence-reviewed').value, source_title: field('evidence-title').value.trim(), url: field('evidence-url').value.trim(), summary: field('evidence-summary').value.trim() };
      if (entry.reviewed_on > today()) throw Error('Review date cannot be in the future.');
      if (entry.action === 'vote') Object.assign(entry, { vote: field('evidence-vote').value, vote_question: field('evidence-question').value.trim(), roll_call_url: field('evidence-rollcall').value.trim() });
      if (selected) next.evidence[next.evidence.findIndex(item => item.id === selected)] = entry; else next.evidence.push(entry);
      next.reviewed_on = [next.reviewed_on, entry.reviewed_on].sort().at(-1);
      commit(catalog, next, 'Legislative record saved. Download scorecards.json as well to publish it.'); refreshActions(editingId);
    }); });
    field('remove-evidence').addEventListener('click', () => attempt(() => {
      const id = field('edit-evidence').value; if (!id) return;
      const next = clone(research); next.evidence = next.evidence.filter(entry => entry.id !== id);
      commit(catalog, next, 'Legislative record removed.'); refreshActions(editingId);
    }));
    for (const kind of ['catalog', 'research']) {
      field(`export-${kind}`).addEventListener('click', () => attempt(() => download(kind === 'catalog' ? 'calls-to-action.json' : 'scorecards.json', kind === 'catalog' ? catalog : research)));
      field(`import-${kind}`).addEventListener('change', async event => {
        try { const file = event.target.files[0]; if (!file) return; const value = JSON.parse(await file.text()); commit(kind === 'catalog' ? value : catalog, kind === 'research' ? value : research, 'Imported file.'); refreshActions(editingId); }
        catch (error) { report(`Import rejected: ${error.message}`); }
        event.target.value = '';
      });
    }
    field('discard-draft').addEventListener('click', () => { if (confirm('Discard saved local changes and reload published files?')) attempt(() => { localStorage.removeItem(draftKey); location.reload(); }); });
  } catch (error) { report(`${error.message} Serve this folder over HTTP and reload.`); }
}
bootManager();
