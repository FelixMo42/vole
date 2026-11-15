const test = require('node:test');
const assert = require('node:assert/strict');
const { assess, request, actionRequest, validate } = require('../scoring.js');
const dataset = require('../scorecards.json');
const roster = require('../db.json').legislators;
const asOf = '2026-11-14';
const member = roster[0];

function fixture(positions) {
  // Keep a five-priority fixture to exercise the engine independently of the live rubric.
  const priorities = Array.from({ length: 5 }, (_, index) => ({ ...dataset.priorities[0], id: `test-priority-${index}` }));
  const bills = priorities.map(priority => ({ ...dataset.bills[1], id: `test-${priority.id}`, priority: priority.id }));
  return { ...dataset, priorities, bills, evidence: positions.map((position, index) => ({
    ...dataset.evidence[0], id: `test-${index}`, member_id: member.id,
    priority: priorities[index].id, bill_id: bills[index].id, position, date: asOf, reviewed_on: asOf
  })) };
}

test('published evidence has valid identities, sources, dates and references', () => {
  validate(roster, dataset);
  assert.equal(roster.length, 539);
  assert.equal(dataset.evidence.length, 23);
  assert.equal(new Set(dataset.evidence.map(entry => entry.member_id)).size, 21);
  const assessments = roster.map(person => assess(person.id, dataset, asOf));
  assert.equal(assessments.filter(result => result.coverage > 0).length, 15);
  assert(assessments.every(result => result.overall === null));
});

test('no evidence is unknown rather than opposition or a zero score', () => {
  const result = assess(member.id, { ...dataset, evidence: [] }, asOf);
  assert.equal(result.coverage, 0);
  assert.equal(result.alignment, null);
  assert.equal(result.overall, null);
  assert(result.findings.every(finding => finding.position === 'unknown'));
});

test('live rubric matches the three calls to action and requires two for an overall score', () => {
  const catalog = require('../calls-to-action.json');
  assert.equal(dataset.priorities.length, 3);
  assert.deepEqual(new Set(dataset.priorities.map(priority => priority.id)), new Set(catalog.actions.map(action => action.priority_id)));
  const data = { ...fixture(['support', 'oppose']), priorities: dataset.priorities };
  data.bills = data.bills.slice(0, 3).map((bill, index) => ({ ...bill, priority: dataset.priorities[index].id }));
  data.evidence = data.evidence.map((entry, index) => ({ ...entry, priority: dataset.priorities[index].id }));
  const one = assess(member.id, { ...data, evidence: data.evidence.slice(0, 1) }, asOf);
  assert(Math.abs(one.coverage - 100 / 3) < 1e-10);
  assert.equal(one.overall, null);
  const two = assess(member.id, data, asOf);
  assert(Math.abs(two.coverage - 200 / 3) < 1e-10);
  assert.equal(two.overall, 50);
});

test('coverage gates overall scores and preserves genuine opposition scores', () => {
  const sparse = assess(member.id, fixture(['support', 'support']), asOf);
  assert.equal(sparse.coverage, 40);
  assert.equal(sparse.alignment, 100);
  assert.equal(sparse.overall, null);
  const eligible = assess(member.id, fixture(['support', 'oppose', 'mixed']), asOf);
  assert.equal(eligible.coverage, 60);
  assert.equal(eligible.overall, 50);
  assert.equal(assess(member.id, fixture(['oppose', 'oppose', 'oppose']), asOf).overall, 0);
});

test('statements earn no points or coverage and never negate legislative actions', () => {
  const data = fixture(['support', 'oppose']);
  data.evidence[0].action = 'statement';
  const result = assess(member.id, data, asOf);
  assert.equal(result.coverage, 20);
  assert.equal(result.alignment, 0);
  data.evidence.push({ ...data.evidence[0], id: 'duplicate-action' });
  assert.deepEqual(assess(member.id, data, asOf).coverage, result.coverage);
  const speechOnly = fixture(['support']);
  speechOnly.evidence[0].action = 'statement';
  assert.equal(assess(member.id, speechOnly, asOf).coverage, 0);
  assert.equal(assess(member.id, speechOnly, asOf).alignment, null);
  const contradiction = fixture(['support']);
  contradiction.evidence.push({ ...contradiction.evidence[0], id: 'speech', action: 'statement', position: 'oppose' });
  assert.equal(assess(member.id, contradiction, asOf).alignment, 100);
  assert.throws(() => validate(roster, speechOnly), /action or position/);
});

test('duplicate legislative records do not inflate scores or coverage', () => {
  const data = fixture(['support']);
  const result = assess(member.id, data, asOf);
  data.evidence.push({ ...data.evidence[0], id: 'duplicate-action' });
  assert.equal(assess(member.id, data, asOf).coverage, result.coverage);
  assert.equal(assess(member.id, data, asOf).alignment, result.alignment);
});

test('contradictions are visible and mixed, not overwritten by favorable evidence', () => {
  const data = fixture(['support']);
  data.evidence.push({ ...data.evidence[0], id: 'opposition', position: 'oppose' });
  const result = assess(member.id, data, asOf);
  assert.equal(result.findings[0].position, 'mixed');
  assert.equal(result.findings[0].evidence.length, 2);
  assert.equal(result.alignment, 50);
  assert.equal(result.coverage, 20);
});

test('freshness uses action date, includes the boundary, and ignores future actions', () => {
  const data = fixture(['support']);
  data.evidence[0].date = '2025-11-14';
  assert.equal(assess(member.id, data, asOf).coverage, 20);
  data.evidence[0].date = '2025-11-13';
  const historical = assess(member.id, data, asOf);
  assert.equal(historical.coverage, 0);
  assert.equal(historical.findings[0].evidence.length, 1);
  data.evidence[0].date = '2026-11-15';
  assert.equal(assess(member.id, data, asOf).findings[0].evidence.length, 0);
});

test('nonuniform priority weights are respected', () => {
  const data = fixture(['support', 'oppose']);
  data.priorities = data.priorities.map((priority, index) => ({ ...priority, weight: index === 0 ? 60 : 10 }));
  const result = assess(member.id, data, asOf);
  assert.equal(result.coverage, 70);
  assert.equal(result.overall, 86);
});

test('drafts make a courteous legislative request and invite a response', () => {
  for (const position of ['support', 'oppose', 'mixed']) {
    const data = fixture([position]);
    const result = assess(member.id, data, asOf);
    const draft = request(member, result.findings[0], data, asOf);
    assert(draft.includes(member.name));
    assert(draft.includes('Would you consider'));
    assert(draft.includes('Thank you for your time'));
    assert(draft.includes('hear your perspective'));
    assert(!/within 30 days|If you decline|does not fulfill/.test(draft));
  }
  const unknown = assess(member.id, { ...dataset, evidence: [] }, asOf).findings[0];
  assert(request(member, unknown, dataset, asOf).includes(unknown.priority.request));
});

test('ban bill requests use correct chamber and avoid asking sponsors to cosponsor again', () => {
  for (const office of ['house', 'senate']) {
    const person = roster.find(person => person.office === office && !dataset.evidence.some(entry => entry.member_id === person.id));
    const finding = assess(person.id, dataset, asOf).findings.find(finding => finding.priority.id === 'superintelligence-ban');
    const draft = actionRequest(person, finding, dataset, asOf);
    assert(draft.includes(office === 'house' ? 'H.R. 10538' : 'S. 5493'));
    assert(draft.includes('if you have not already'));
    assert(draft.includes('official cosponsor'));
    assert(actionRequest(person, finding, dataset, '2027-01-03').includes('successor legislation'));
  }
  for (const id of ['S000033', 'C001131', 'G000586']) {
    const person = roster.find(person => person.id === id);
    const finding = assess(id, dataset, asOf).findings.find(finding => finding.priority.id === 'superintelligence-ban');
    const draft = actionRequest(person, finding, dataset, asOf);
    assert(draft.includes('requesting a committee hearing'));
    assert(!draft.includes('become an official cosponsor'));
    assert.equal(finding.position, 'support');
    assert.equal(finding.current.length, 1);
  }
});

test('floor votes require roll calls and do not require originating-chamber membership', () => {
  const data = fixture(['support']);
  data.evidence[0].action = 'vote';
  assert.throws(() => validate(roster, data), /Vote requires/);
  Object.assign(data.evidence[0], { vote: 'yea', vote_question: 'On passage', roll_call_url: 'https://www.senate.gov/legislative/votes/example.htm' });
  data.bills[0].chamber = 'senate';
  validate(roster, data);
  data.evidence[0].member_id = roster.find(person => person.state === 'PR').id;
  assert.throws(() => validate(roster, data), /delegates/);
});

test('invalid evidence fails closed instead of publishing a misleading score', () => {
  for (const modification of [
    { member_id: 'missing' }, { priority: 'missing' }, { position: 'invented' },
    { action: 'donation' }, { url: 'javascript:alert(1)' }, { date: '2026-02-30' },
    { date: '2026-12-01' }, { bill_id: 'missing' }
  ]) {
    const data = fixture(['support']);
    Object.assign(data.evidence[0], modification);
    assert.throws(() => validate(roster, data));
  }
  const data = fixture(['support']);
  validate(roster, data);
  data.evidence.push(data.evidence[0]);
  assert.throws(() => validate(roster, data));
  const wrongChamber = fixture(['support']);
  wrongChamber.bills[0].chamber = 'senate';
  assert.throws(() => validate(roster, wrongChamber), /chamber/);
});
