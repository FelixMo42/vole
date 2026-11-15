const el = id => document.getElementById(id);
const make = (tag, text, className) => { const item = document.createElement(tag); if (text !== undefined) item.textContent = text; if (className) item.className = className; return item; };
const recordLabels = { oppose: 'Opposing action', mixed: 'Partial / mixed', unknown: 'Not researched' };
let catalog, research, roster, selectedAction, visibleLimit = 30;
const filters = ['member-search', 'member-chamber', 'member-state', 'member-record'];

function renderMenu() {
  const query = el('action-search').value.trim().toLocaleLowerCase();
  const actions = catalog.actions.filter(action => `${action.title} ${action.description} ${research.bills.filter(bill => action.bill_ids.includes(bill.id)).map(bill => bill.number).join(' ')}`.toLocaleLowerCase().includes(query));
  el('action-list').replaceChildren(...actions.map(action => {
    const link = make('a', action.title, 'action-choice');
    link.href = `#${action.id}`;
    if (action.id === selectedAction?.id) link.setAttribute('aria-current', 'true');
    link.append(make('small', action.lifecycle === 'archived' ? 'Archived' : `${action.bill_ids.length} linked bills`));
    return link;
  }));
  if (!actions.length) el('action-list').append(make('p', 'No matching calls to action.'));
}

function selectAction() {
  const id = location.hash.slice(1);
  selectedAction = catalog.actions.find(action => action.id === id) || catalog.actions.find(action => action.lifecycle === 'active') || catalog.actions[0];
  if (!selectedAction) { el('explorer').hidden = true; el('load-status').textContent = 'No calls to action have been added yet.'; return; }
  el('action-title').textContent = selectedAction.title;
  el('action-description').textContent = selectedAction.description;
  el('action-request').textContent = selectedAction.request;
  el('action-lifecycle').textContent = `${selectedAction.lifecycle} · Call to action`;
  el('action-link').href = `#${selectedAction.id}`;
  el('action-bills').replaceChildren(...research.bills.filter(bill => selectedAction.bill_ids.includes(bill.id)).map(bill => {
    const section = make('div', undefined, 'evidence');
    const link = make('a', `${bill.number} · ${bill.title}`); link.href = bill.url;
    section.append(link, make('p', `${bill.chamber === 'house' ? 'House' : 'Senate'} · Introduced ${bill.introduced_on}. ${bill.source_scope}`, 'fine-print'));
    if (new Date().toISOString().slice(0, 10) >= bill.congress_ends_on) section.append(make('p', 'This Congress has ended. Request successor legislation.', 'finding'));
    return section;
  }));
  const documented = roster.filter(member => CallsToAction.memberStatus(selectedAction, member.id, research).evidence.length).length;
  el('action-counts').textContent = `${documented} of ${roster.length} members have a researched legislative action. Records include historical actions; this is not a complete sponsor list.`;
  visibleLimit = 30;
  renderMenu(); renderMembers();
}

function renderMembers() {
  const query = el('member-search').value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
  const matches = roster.map(member => ({ member, status: CallsToAction.memberStatus(selectedAction, member.id, research) })).filter(({ member, status }) =>
    member.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().includes(query) &&
    (!el('member-chamber').value || member.office === el('member-chamber').value) &&
    (!el('member-state').value || member.state === el('member-state').value) &&
    (!el('member-record').value || status.legislative === el('member-record').value)
  ).sort((a, b) => b.status.evidence.length - a.status.evidence.length || a.member.name.localeCompare(b.member.name));
  el('member-count').textContent = `${matches.length} politicians · Showing ${Math.min(visibleLimit, matches.length)}`;
  el('action-members').replaceChildren(...matches.slice(0, visibleLimit).map(({ member, status }) => {
    const row = make('article', undefined, 'action-member');
    const heading = make('div', undefined, 'action-member-heading');
    const identity = make('div', undefined, 'action-member-identity');
    const title = make('a', member.name); title.href = `./#${member.id}`;
    identity.append(title, make('p', `${member.office === 'house' ? 'House' : 'Senate'} · ${member.state} · ${member.party}`, 'fine-print'));
    const record = make('div', undefined, 'action-member-record');
    const actionLabels = status.evidence.map(entry => {
      const bill = research.bills.find(bill => bill.id === entry.bill_id);
      if (entry.action === 'vote') return `Voted ${entry.vote} on ${bill.number}`;
      return `${entry.action === 'sponsor' ? 'Sponsored' : 'Cosponsored'} ${bill.number}`;
    });
    record.append(make('p', status.legislative === 'support' ? [...new Set(actionLabels)].join(' · ') : recordLabels[status.legislative], 'finding'));
    const historicalCount = status.evidence.filter(entry => (Date.parse(new Date().toISOString().slice(0, 10)) - Date.parse(entry.date)) / 86400000 > research.freshness_days).length;
    if (status.evidence.length) record.append(make('p', `${status.evidence.length} recorded ${status.evidence.length === 1 ? 'action' : 'actions'}${historicalCount ? ` · ${historicalCount} historical` : ''}`, 'fine-print'));
    heading.append(identity, record); row.append(heading);
    const expanded = make('details', undefined, 'action-member-details');
    const summary = make('summary', 'View details'); summary.setAttribute('aria-label', `Evidence and request for ${member.name}`); expanded.append(summary);
    for (const entry of status.evidence) {
      const source = make('a', `${research.bills.find(bill => bill.id === entry.bill_id).number} · ${entry.action}${entry.vote ? ` (${entry.vote})` : ''} · ${entry.position} · ${entry.date}`);
      source.href = entry.action === 'vote' ? entry.roll_call_url : entry.url;
      const historical = (Date.parse(new Date().toISOString().slice(0, 10)) - Date.parse(entry.date)) / 86400000 > research.freshness_days;
      const evidence = make('div', undefined, 'evidence'); evidence.append(source, make('p', entry.summary, 'fine-print'));
      if (historical) evidence.append(make('p', 'Historical · excluded from recent-action scoring', 'fine-print'));
      expanded.append(evidence);
    }
    const details = make('div'); details.append(make('h3', 'Prepare a request'));
    const draft = make('textarea'); draft.readOnly = true; draft.rows = 7; draft.value = CallsToAction.request(selectedAction, member, research); draft.setAttribute('aria-label', `Request to ${member.name}`);
    const copy = make('button', 'Copy request'); copy.type = 'button';
    const feedback = make('span', '', 'fine-print'); feedback.setAttribute('role', 'status');
    copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(draft.value); feedback.textContent = 'Copied. Review before sending.'; } catch { draft.focus(); draft.select(); feedback.textContent = 'Select and copy the text manually.'; } });
    details.append(draft, copy, feedback, make('p', 'Review and personalize. Nothing is sent automatically.', 'fine-print')); expanded.append(details); row.append(expanded);
    return row;
  }));
  if (!matches.length) el('action-members').append(make('p', 'No politicians match these filters.', 'message'));
  el('more-members').hidden = matches.length <= visibleLimit;
}

async function loadActions() {
  try {
    [catalog, research, { legislators: roster }] = await Promise.all(['calls-to-action.json', 'scorecards.json', 'db.json'].map(async path => { const response = await fetch(path); if (!response.ok) throw Error('Loading failed'); return response.json(); }));
    Scorecards.validate(roster, research); CallsToAction.validate(catalog, research);
    for (const state of [...new Set(roster.map(member => member.state))].sort()) { const option = make('option', state); option.value = state; el('member-state').append(option); }
    el('data-date').textContent = `Legislative evidence reviewed ${research.reviewed_on}. Roster snapshot: November 13, 2026.`;
    el('load-status').textContent = ''; el('explorer').hidden = false; selectAction();
    window.addEventListener('hashchange', selectAction);
    el('action-search').addEventListener('input', renderMenu);
    el('member-filters').addEventListener('submit', event => event.preventDefault());
    for (const id of filters) el(id).addEventListener('input', () => { visibleLimit = 30; renderMembers(); });
    el('clear-members').addEventListener('click', () => { el('member-filters').reset(); visibleLimit = 30; renderMembers(); });
    el('more-members').addEventListener('click', () => { visibleLimit += 30; renderMembers(); });
  } catch { el('explorer').hidden = true; el('load-status').textContent = 'Calls to action could not be loaded. Reload the page or serve this folder over HTTP.'; }
}
loadActions();
