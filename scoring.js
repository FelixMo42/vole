(function (root) {
  const strengths = { sponsor: 1, cosponsor: 1, vote: 1 };
  const values = { support: 100, oppose: 0, mixed: 50 };
  const day = 86400000;

  function validate(roster, dataset) {
    const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
    const require = (condition, message) => { if (!condition) throw new Error(message); };
    require(Array.isArray(roster) && roster.length > 0, 'Missing roster');
    const members = new Set(roster.map(member => member.id));
    require(members.size === roster.length && roster.every(member => /^[A-Z]\d{6}$/.test(member.id) && member.name && member.state && ['house', 'senate'].includes(member.office)), 'Invalid or duplicate roster identities');
    require(dataset && dataset.version && validDate(dataset.reviewed_on) && dataset.research_status === 'incomplete', 'Invalid research metadata');
    require(Number.isInteger(dataset.freshness_days) && dataset.freshness_days > 0 && dataset.minimum_coverage > 0 && dataset.minimum_coverage <= 100, 'Invalid scoring rules');
    require(Array.isArray(dataset.priorities) && dataset.priorities.length > 0 && Array.isArray(dataset.evidence), 'Missing rubric or evidence');
    const priorities = new Set(dataset.priorities.map(priority => priority.id));
    require(priorities.size === dataset.priorities.length && dataset.priorities.every(priority => priority.id && priority.title && priority.description && priority.request && Number.isFinite(priority.weight) && priority.weight > 0), 'Invalid priorities or weights');
    require(Array.isArray(dataset.bills), 'Missing bill registry');
    const bills = new Map(dataset.bills.map(bill => [bill.id, bill]));
    require(bills.size === dataset.bills.length && dataset.bills.every(bill => bill.id && bill.number && bill.title && ['house', 'senate'].includes(bill.chamber) && Number.isInteger(bill.congress) && priorities.has(bill.priority) && validDate(bill.introduced_on) && validDate(bill.congress_ends_on) && bill.introduced_on < bill.congress_ends_on && /^https:\/\//.test(bill.url) && bill.source_scope), 'Invalid bill registry');
    const evidenceIds = new Set();
    for (const entry of dataset.evidence) {
      require(entry.id && !evidenceIds.has(entry.id), 'Duplicate evidence ID');
      evidenceIds.add(entry.id);
      require(members.has(entry.member_id) && priorities.has(entry.priority), 'Unknown evidence reference');
      require(Object.hasOwn(strengths, entry.action) && Object.hasOwn(values, entry.position), 'Invalid action or position');
      const bill = bills.get(entry.bill_id);
      const member = roster.find(person => person.id === entry.member_id);
      require(bill && bill.priority === entry.priority && (entry.action === 'vote' || member.office === bill.chamber), 'Sponsorship must match a bill, priority, and chamber');
      require(entry.date >= bill.introduced_on && entry.date < bill.congress_ends_on, 'Action outside bill lifetime');
      if (entry.action === 'vote') {
        require(!['AS', 'DC', 'GU', 'MP', 'PR', 'VI'].includes(member.state), 'Floor votes cannot be attributed to delegates');
        require(['yea', 'nay'].includes(entry.vote) && entry.vote_question && /^https:\/\/[^\s]+$/.test(entry.roll_call_url), 'Vote requires a recorded result, question, and roll call');
      }
      require(validDate(entry.date) && validDate(entry.reviewed_on) && entry.date <= entry.reviewed_on && entry.reviewed_on <= dataset.reviewed_on, 'Invalid evidence dates');
      require(entry.source_title && entry.summary && typeof entry.url === 'string' && /^https:\/\/[^\s]+$/.test(entry.url), 'Missing evidence source or explanation');
    }
  }

  function assess(memberId, dataset, asOf = new Date().toISOString().slice(0, 10)) {
    const today = Date.parse(asOf);
    const findings = dataset.priorities.map(priority => {
      const evidence = dataset.evidence.filter(entry => entry.member_id === memberId && entry.priority === priority.id && Date.parse(entry.date) <= today);
      const current = evidence.filter(entry => Object.hasOwn(strengths, entry.action) && (today - Date.parse(entry.date)) / day <= dataset.freshness_days);
      const directions = [...new Set(current.map(entry => entry.position))];
      const position = directions.length > 1 ? 'mixed' : directions[0] || 'unknown';
      const strength = current.length ? Math.max(...current.map(entry => strengths[entry.action])) : 0;
      return { priority, evidence, current, position, strength, value: values[position] ?? null };
    });
    const totalWeight = dataset.priorities.reduce((sum, priority) => sum + priority.weight, 0);
    const knownWeight = findings.reduce((sum, finding) => sum + finding.priority.weight * finding.strength, 0);
    const coverage = 100 * knownWeight / totalWeight;
    const alignment = knownWeight ? Math.round(findings.reduce((sum, finding) => sum + (finding.value ?? 0) * finding.priority.weight * finding.strength, 0) / knownWeight) : null;
    return { findings, coverage, alignment, overall: coverage >= dataset.minimum_coverage ? alignment : null };
  }

  function actionRequest(member, finding, dataset, asOf = new Date().toISOString().slice(0, 10)) {
    const bill = dataset.bills.find(bill => bill.priority === finding.priority.id && bill.chamber === member.office);
    if (!bill) return finding.priority.request;
    if (asOf >= bill.congress_ends_on) return `Would you consider introducing or cosponsoring successor legislation to ${bill.number}, ${bill.title}, in the current Congress? I would appreciate your help carrying this work forward.`;
    const signed = finding.evidence.some(entry => entry.bill_id === bill.id && ['sponsor', 'cosponsor'].includes(entry.action) && entry.date <= asOf);
    const nextStep = signed
      ? `Thank you for your recorded sponsorship or cosponsorship of ${bill.number}. Would you consider requesting a committee hearing on ${bill.number} and helping it move toward a recorded vote when procedurally available? I would welcome an update on how this work is progressing.`
      : `Would you consider becoming an official cosponsor of ${bill.number}, ${bill.title}, if you have not already joined? If you have, thank you; I would be grateful for an update.`;
    const additional = bill.priority === 'evaluations' ? ' I would also welcome an amendment requiring independent pre-deployment safety evaluations, building on the disclosures in this bill.' : '';
    return `${nextStep}${additional} I understand the next steps depend on the bill's current status and committee process. For reference: ${bill.url}`;
  }

  function request(member, finding, dataset, asOf) {
    return `Dear ${member.office === 'senate' ? 'Senator' : 'Representative'} ${member.name},\n\nI'm writing because I'm concerned about the risks advanced AI could pose to people's safety. I hope Congress can help put thoughtful safeguards in place, and I would appreciate your consideration of ${finding.priority.title.toLowerCase()}.\n\n${actionRequest(member, finding, dataset, asOf)}\n\nI'd be grateful to hear your perspective and learn what next steps you think are possible. Thank you for your time and for considering this concern.\n\nBest wishes,\n[Your name]`;
  }

  const api = { assess, request, actionRequest, validate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Scorecards = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
