/**
 * Citation Engine
 * Platform-Owned Intelligence
 * Responsible for Citation Detection, Scoring, Attribution, and Contribution.
 */

export const detectCitations = (queryText, source) => {
  const queryTerms = queryText.toLowerCase().split(' ').filter(t => t.length > 3);
  const content = (source.content || '').toLowerCase();
  
  let matches = 0;
  let matchedSnippet = '';
  
  queryTerms.forEach(term => {
    const idx = content.indexOf(term);
    if (idx !== -1) {
      matches++;
      if (!matchedSnippet) {
        matchedSnippet = content.substring(Math.max(0, idx - 30), Math.min(content.length, idx + 50)) + '...';
      }
    }
  });

  const citationScore = matches > 0 ? Math.min(100, Math.round((matches / queryTerms.length) * 100)) : 0;
  
  let confidence = 'Low';
  if (citationScore > 80) confidence = 'High';
  else if (citationScore > 40) confidence = 'Medium';

  return {
    citationScore,
    confidence,
    matchedSnippet: citationScore > 0 ? matchedSnippet : null
  };
};
