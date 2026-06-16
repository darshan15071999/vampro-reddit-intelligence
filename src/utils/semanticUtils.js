export function queryDocumentSimilarity(baseQuery, variantQuery, doc) {
  const stops = new Set(['the', 'is', 'in', 'and', 'to', 'of', 'a', 'for', 'on', 'with', 'how', 'why', 'what', 'where', 'when', 'does', 'do', 'it', 'my', 'i', 'you', 'are']);
  const tokenize = (text) => (text.toLowerCase().match(/[a-z0-9]+/g) || []).filter(t => !stops.has(t) && t.length > 1);
  const baseTokens = tokenize(baseQuery);
  const variantTokens = tokenize(variantQuery);
  const dTokens = tokenize(doc);
  if (!baseTokens.length || !dTokens.length) return 0;
  const baseMatchCount = baseTokens.filter(bt => dTokens.some(dt => dt === bt || (bt.length >= 4 && dt.startsWith(bt)))).length;
  if ((baseMatchCount / baseTokens.length) < 0.3) return 0;
  let matchCount = 0;
  variantTokens.forEach(vt => { if (dTokens.some(dt => dt === vt || (vt.length >= 4 && dt.startsWith(vt)))) matchCount += 1; });
  const corePhrase = baseTokens.join(' ');
  const exactMatch = (corePhrase.length > 3 && doc.toLowerCase().includes(corePhrase)) ? 0.3 : 0;
  return Math.min(1, (matchCount / variantTokens.length) * 0.7 + exactMatch);
}

export function generateSemanticCluster(baseQuery) {
  const query = baseQuery.toLowerCase().trim();
  let coreSubject = query; let context = "enterprise environments";
  let isComparison = query.includes(' vs ');

  if (query.includes(" with ")) { const parts = query.split(" with "); coreSubject = parts[0].trim(); context = parts[1].trim(); }
  else if (query.includes(" for ")) { const parts = query.split(" for "); coreSubject = parts[0].trim(); context = parts[1].trim(); }
  else if (query.includes(" in ")) { const parts = query.split(" in "); coreSubject = parts[0].trim(); context = parts[1].trim(); }

  let subjectAlternative = coreSubject;
  // This uses a generic mapping instead of hardcoded specific tools where possible, 
  // though for now we retain the existing logic to prevent breaking functionality
  if (coreSubject.includes("documentation")) subjectAlternative = "knowledge base platforms";
  else if (coreSubject.includes("database")) subjectAlternative = "data storage solutions";

  if (isComparison) {
    const p = query.split(" vs ");
    return [`differences between ${p[0]} and ${p[1]}`, `which is better ${p[0]} or ${p[1]}`, `${p[0]} pros and cons compared to ${p[1]}`, `migrating from ${p[0]} to ${p[1]}`, `top alternatives to ${p[0]} and ${p[1]}`, `${p[0]} vs ${p[1]} for ${context}`];
  }
  return [`top ${subjectAlternative} supporting ${context}`, `how to implement ${context} in ${coreSubject}`, `best practices for ${query}`, `${coreSubject} vs alternatives for ${context}`, `${context} native ${subjectAlternative}`, `troubleshooting ${context} integration in ${coreSubject}`];
}
