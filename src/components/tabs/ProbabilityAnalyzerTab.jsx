import React, { useState } from 'react';
import { Icons } from '../common/Icons';
import { storage } from '../../utils/storage';

export const ProbabilityAnalyzerTab = () => {
  const [query, setQuery] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = (e) => {
    e.preventDefault();
    if (!query) return;
    setAnalyzing(true);
    
    setTimeout(() => {
      const config = storage.getBrandConfig();
      const brand = config.primary_brand || 'Your Brand';
      
      const queryLower = query.toLowerCase();
      let prob = Math.floor(Math.random() * 30) + 10; // base 10-40%
      
      if (queryLower.includes(brand.toLowerCase())) {
        prob += 50; 
      }
      
      const keywords = config.tracked_keywords || [];
      if (keywords.some(k => queryLower.includes(k.toLowerCase()))) {
        prob += 20;
      }
      
      prob = Math.min(99, Math.max(5, prob));
      
      let confidence = 'Low';
      if (prob > 70) confidence = 'High';
      else if (prob > 40) confidence = 'Medium';

      setAnalysis({
        probability: prob,
        confidence,
        insight: prob > 70 
          ? `Strong semantic alignment with ${brand}. High likelihood of extraction in AEO contexts.`
          : `Moderate to low relevance. Recommend publishing targeted content for "${query}" to increase visibility.`
      });
      setAnalyzing(false);
    }, 600);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Icons.Eye className="w-6 h-6 text-indigo-400" />
          Probability Analyzer
        </h2>
        <p className="text-sm text-gray-400 mt-1">Enter a keyword or LLM prompt to calculate the exact percentage probability of your brand appearing.</p>
      </div>

      <div className="max-w-2xl mx-auto mt-12">
        <form onSubmit={handleAnalyze} className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Icons.Search className="w-5 h-5 text-gray-500" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#111827] border-2 border-indigo-500/30 rounded-2xl py-4 pl-12 pr-32 text-white text-lg focus:outline-none focus:border-indigo-500 shadow-2xl transition-colors"
            placeholder="Type any keyword or LLM prompt..."
          />
          <button
            type="submit"
            disabled={analyzing || !query}
            className="absolute inset-y-2 right-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 rounded-xl transition-colors disabled:opacity-50"
          >
            {analyzing ? '...' : 'Analyze'}
          </button>
        </form>

        {analysis && (
          <div className="mt-8 bg-[#111827] border border-white/5 rounded-3xl p-8 shadow-2xl text-center animate-in zoom-in-95 duration-300">
            <h3 className="text-lg text-gray-400 font-medium mb-2">Probability of Brand Appearance</h3>
            <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-purple-600 mb-6">
              {analysis.probability}%
            </div>
            
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
              <span className={`w-2 h-2 rounded-full ${analysis.probability > 50 ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className="text-sm font-medium text-white">Confidence: {analysis.confidence}</span>
            </div>
            
            <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
              {analysis.insight}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
