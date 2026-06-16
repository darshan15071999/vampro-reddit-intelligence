/**
 * Query Engine
 * Platform-Owned Intelligence
 * Responsible for Intent Classification, Query Relationships, Query Influence, Query Coverage.
 */

export const classifyIntent = (queryText) => {
  const text = queryText.toLowerCase();
  if (text.includes('how to') || text.includes('what is') || text.includes('tutorial')) {
    return 'Informational';
  } else if (text.includes('best') || text.includes('vs') || text.includes('compare') || text.includes('alternative')) {
    return 'Commercial Investigation';
  } else if (text.includes('buy') || text.includes('pricing') || text.includes('discount')) {
    return 'Transactional';
  }
  return 'Navigational';
};

export const analyzeQueryCoverage = (queryText, sources) => {
  let coverageScore = 0;
  const terms = queryText.toLowerCase().split(' ').filter(t => t.length > 3);
  
  if (terms.length === 0) return 0;

  sources.forEach(source => {
    const content = (source.content || '').toLowerCase();
    let matches = 0;
    terms.forEach(term => {
      if (content.includes(term)) matches++;
    });
    
    // Normalize coverage per source
    const sourceCoverage = (matches / terms.length) * 100;
    if (sourceCoverage > coverageScore) {
      coverageScore = sourceCoverage; // Take max coverage from best single source
    }
  });

  return Math.round(coverageScore);
};
