import React, { useState, useEffect } from 'react';
import { Icons } from '../common/Icons';
import { storage } from '../../utils/storage';

export const QueryLibraryTab = () => {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQueries = () => {
      try {
        const data = storage.getQueries();
        setQueries(data || []);
      } catch (err) {
        console.error('Failed to fetch queries', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQueries();
  }, []);

  if (loading) return <div className="text-white p-8">Loading Query Library...</div>;

  // Segregate by category
  const categorized = {
    Brand: queries.filter(q => q.category === 'Brand'),
    Competitor: queries.filter(q => q.category === 'Competitor'),
    Industry: queries.filter(q => q.category === 'Industry'),
    General: queries.filter(q => q.category === 'General')
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Query Library</h2>
          <p className="text-sm text-gray-400 mt-1">A segregated view of all search terms and LLM prompts tracked by the intelligence engine.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(categorized).map(([category, qs]) => (
          <div key={category} className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
              <span>{category} Queries</span>
              <span className="text-xs font-mono bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded">{qs.length}</span>
            </h3>
            
            {qs.length === 0 ? (
              <div className="text-gray-500 text-sm italic">No {category.toLowerCase()} queries configured. Add them in Platform Setup.</div>
            ) : (
              <div className="space-y-3">
                {qs.map((q, idx) => (
                  <div key={q.id || idx} className="bg-[#080B14] border border-white/5 rounded-xl p-4 flex justify-between items-center group hover:border-indigo-500/30 transition-colors">
                    <div>
                      <div className="text-sm font-medium text-white">{q.query}</div>
                      <div className="text-xs text-gray-500 mt-1">Intent: {q.intent}</div>
                    </div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 bg-white/5 px-2 py-1 rounded">
                      {q.generation_method}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
