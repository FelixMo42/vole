(function (root) {
  function validate(catalog, research) {
    const require = (condition, message) => { if (!condition) throw new Error(message); };
    require(catalog?.version === 1 && Array.isArray(catalog.actions), 'Invalid calls-to-action file.');
    const ids = new Set();
    for (const action of catalog.actions) {
      require(typeof action.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(action.id) && !ids.has(action.id), 'Action IDs must be unique lowercase slugs.');
      ids.add(action.id);
      require(['title', 'description', 'request'].every(key => typeof action[key] === 'string' && action[key].trim()), 'Each action needs a title, description and request.');
      require(['active', 'archived'].includes(action.lifecycle), 'Invalid action lifecycle.');
      require(action.priority_id === null || research.priorities.some(priority => priority.id === action.priority_id), 'Unknown rubric priority.');
      require(Array.isArray(action.bill_ids) && new Set(action.bill_ids).size === action.bill_ids.length && action.bill_ids.every(id => research.bills.some(bill => bill.id === id && bill.priority === action.priority_id)), 'Bills must match the selected rubric priority.');
    }

  }

  function memberStatus(action, memberId, research, asOf = new Date().toISOString().slice(0, 10)) {
    const evidence = research.evidence.filter(entry => entry.member_id === memberId && entry.date <= asOf && (action.bill_ids.length ? action.bill_ids.includes(entry.bill_id) : false));
    const positions = new Set(evidence.map(entry => entry.position));
    const legislative = !evidence.length ? 'unknown' : positions.size > 1 || positions.has('mixed') ? 'mixed' : positions.has('oppose') ? 'oppose' : 'support';
    return { evidence: evidence.slice().sort((a, b) => b.date.localeCompare(a.date)), legislative };
  }

  function request(action, member, research, asOf = new Date().toISOString().slice(0, 10)) {
    const bill = research.bills.find(bill => action.bill_ids.includes(bill.id) && bill.chamber === member.office);
    let body = action.request;
    if (bill) {
      if (asOf >= bill.congress_ends_on) body = `Would you consider introducing or cosponsoring successor legislation to ${bill.number}, ${bill.title}, in the current Congress? I would appreciate your help carrying this work forward.`;
      else if (research.evidence.some(entry => entry.member_id === member.id && entry.bill_id === bill.id && entry.date <= asOf && ['sponsor', 'cosponsor'].includes(entry.action))) body = `Thank you for your recorded sponsorship or cosponsorship of ${bill.number}. Would you consider requesting a committee hearing and helping it move toward a recorded vote when procedurally available? I would welcome an update on how this work is progressing.`;
      else body = `Would you consider becoming an official cosponsor of ${bill.number}, ${bill.title}, if you have not already joined? If you have, thank you; I would be grateful for an update.`;
      if (action.priority_id === 'evaluations') body += ' I would also welcome independent pre-deployment safety evaluations, building on the disclosures in this bill.';
      body += ` I understand the next steps depend on the bill's current status and committee process. For reference: ${bill.url}`;
    }
    return `Dear ${member.office === 'senate' ? 'Senator' : 'Representative'} ${member.name},\n\nI'm writing because I'm concerned about the risks advanced AI could pose to people's safety. I hope Congress can help put thoughtful safeguards in place.\n\n${body}\n\nI'd be grateful to hear your perspective and learn what next steps you think are possible. Thank you for your time and for considering this concern.\n\nBest wishes,\n[Your name]`;
  }
  const api = { validate, memberStatus, request };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CallsToAction = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
