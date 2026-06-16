import React, { useState, useEffect } from 'react';
import { Icons } from '../common/Icons';
import { storage } from '../../utils/storage';

export const SettingsTab = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Brand Form State
  const [brandData, setBrandData] = useState({
    primary_brand: '',
    industry: '',
    tracked_keywords: '',
    competitors: '',
    competitor_keywords: ''
  });

  // Queries State
  const [queries, setQueries] = useState([]);
  const [newQuery, setNewQuery] = useState({ query: '', intent: 'Informational', category: 'General', generation_method: 'Manual' });

  useEffect(() => {
    fetchSetupData();
  }, []);

  const fetchSetupData = () => {
    try {
      const config = storage.getBrandConfig();
      setBrandData({
        primary_brand: config.primary_brand || '',
        industry: config.industry || '',
        tracked_keywords: Array.isArray(config.tracked_keywords) ? config.tracked_keywords.join(', ') : '',
        competitors: Array.isArray(config.competitors) ? config.competitors.join(', ') : '',
        competitor_keywords: Array.isArray(config.competitor_keywords) ? config.competitor_keywords.join(', ') : ''
      });

      const savedQueries = storage.getQueries();
      setQueries(savedQueries || []);
    } catch (err) {
      console.error('Failed to fetch setup data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBrandSave = (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        primary_brand: brandData.primary_brand,
        industry: brandData.industry,
        tracked_keywords: brandData.tracked_keywords.split(',').map(k => k.trim()).filter(Boolean),
        tracked_features: [], 
        competitors: brandData.competitors.split(',').map(c => c.trim()).filter(Boolean),
        competitor_keywords: brandData.competitor_keywords.split(',').map(k => k.trim()).filter(Boolean)
      };

      const success = storage.saveBrandConfig(payload);
      if (success) {
        alert('Brand configuration saved successfully.');
      } else {
        alert('Failed to save profile to local storage.');
      }
    } catch (err) {
      alert('Error saving config.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuery = (e) => {
    e.preventDefault();
    if (!newQuery.query) return;
    setSaving(true);
    try {
      const success = storage.saveQuery(newQuery);
      if (success) {
        setNewQuery({ query: '', intent: 'Informational', category: 'General', generation_method: 'Manual' });
        fetchSetupData(); // Refresh list
        alert('Query added successfully.');
      } else {
        alert('Failed to add query to local storage.');
      }
    } catch (err) {
      alert('Error adding query.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-white p-8">Loading setup data...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Platform Setup</h2>
        <p className="text-sm text-gray-400 mt-1">Configure your brand, competitors, and core tracking queries. This data drives all intelligence engines.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Brand & Competitor Configuration */}
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Icons.Shield className="w-5 h-5 text-indigo-400" />
            Brand & Competitor Profile
          </h3>
          
          <form onSubmit={handleBrandSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Brand Name</label>
              <input type="text" value={brandData.primary_brand} onChange={(e) => setBrandData({...brandData, primary_brand: e.target.value})} className="w-full bg-[#080B14] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. Vampro" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Industry</label>
              <input type="text" value={brandData.industry} onChange={(e) => setBrandData({...brandData, industry: e.target.value})} className="w-full bg-[#080B14] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. AI SaaS" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Brand Keywords (Comma Separated)</label>
              <textarea value={brandData.tracked_keywords} onChange={(e) => setBrandData({...brandData, tracked_keywords: e.target.value})} rows={2} className="w-full bg-[#080B14] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. visibility intelligence, citations" />
            </div>
            
            <div className="pt-4 border-t border-white/5 mt-4">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Competitor Names (Comma Separated)</label>
              <input type="text" value={brandData.competitors} onChange={(e) => setBrandData({...brandData, competitors: e.target.value})} className="w-full bg-[#080B14] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. Competitor A, Competitor B" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Competitor Keywords (Comma Separated)</label>
              <textarea value={brandData.competitor_keywords} onChange={(e) => setBrandData({...brandData, competitor_keywords: e.target.value})} rows={2} className="w-full bg-[#080B14] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. legacy tracking, manual search" />
            </div>

            <div className="flex justify-end pt-4">
              <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Search & LLM Queries */}
        <div className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-lg flex flex-col h-full">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Icons.Search className="w-5 h-5 text-purple-400" />
            LLM Search Queries & Keywords
          </h3>
          
          <form onSubmit={handleAddQuery} className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Add New Query</label>
              <div className="flex gap-2">
                <input type="text" value={newQuery.query} onChange={(e) => setNewQuery({...newQuery, query: e.target.value})} className="flex-1 bg-[#080B14] border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. Best AI tools for visibility" />
                <button type="submit" disabled={saving || !newQuery.query} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2">
                  <Icons.Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>
            <div className="flex gap-4">
              <select value={newQuery.category} onChange={(e) => setNewQuery({...newQuery, category: e.target.value})} className="flex-1 bg-[#080B14] border border-white/10 rounded-lg px-4 py-2 text-gray-300 text-xs focus:outline-none focus:border-indigo-500">
                <option value="Brand">Brand Query</option>
                <option value="Competitor">Competitor Query</option>
                <option value="Industry">Industry Query</option>
                <option value="General">General</option>
              </select>
              <select value={newQuery.intent} onChange={(e) => setNewQuery({...newQuery, intent: e.target.value})} className="flex-1 bg-[#080B14] border border-white/10 rounded-lg px-4 py-2 text-gray-300 text-xs focus:outline-none focus:border-indigo-500">
                <option value="Informational">Informational</option>
                <option value="Transactional">Transactional</option>
                <option value="Navigational">Navigational</option>
              </select>
            </div>
          </form>

          <div className="flex-1 overflow-y-auto min-h-[200px]">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Saved Queries ({queries.length})</h4>
            <div className="space-y-2">
              {queries.length === 0 ? (
                <div className="text-gray-500 text-sm italic">No queries added yet.</div>
              ) : (
                queries.map(q => (
                  <div key={q.id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">{q.query}</div>
                      <div className="text-[10px] text-gray-400 mt-1 flex gap-2">
                        <span className="bg-white/10 px-1.5 py-0.5 rounded">{q.category}</span>
                        <span className="bg-white/10 px-1.5 py-0.5 rounded">{q.intent}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
