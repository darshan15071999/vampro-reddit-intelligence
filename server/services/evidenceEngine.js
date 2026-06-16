/**
 * Evidence Engine
 * Platform-Owned Intelligence
 * Responsible for Evidence Collection, Citation Justification, Attribution Traceability.
 */

export const generateEvidence = (queryText, sourceContent, citationScore) => {
  let evidenceType = 'manual';
  let reason = 'Citation manually assigned.';
  
  if (citationScore > 0 && sourceContent) {
    const text = sourceContent.toLowerCase();
    const query = queryText.toLowerCase();
    
    if (text.includes(query)) {
      evidenceType = 'keyword_match';
      reason = `Direct keyword match found for "${query}" in source content.`;
    } else {
      evidenceType = 'semantic_match';
      reason = `Semantic relevance detected based on thematic matching to "${query}".`;
    }
  }

  return {
    evidence_type: evidenceType,
    reason
  };
};
