import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from '../components/common/Icons';
import { useAppStore } from '../store/useAppStore';
import { generateEmbedding } from '../utils/aiClient';

export const BrandSetup = () => {
  const navigate = useNavigate();
  const { brandConfig, setBrandConfig, setIsBrandConfigSaved, providers, setProviders, setBrandConfigEmbedding } = useAppStore();

  const handleSave = async () => {
    setIsBrandConfigSaved(true);
    
    // Generate semantic embedding for the brand configuration
    const textToEmbed = `${brandConfig.primaryBrand} ${brandConfig.industry} ${brandConfig.keywords.join(' ')} ${brandConfig.searchTerms.join(' ')}`;
    const embedding = await generateEmbedding(textToEmbed);
    if (embedding) {
      setBrandConfigEmbedding(embedding);
    }
    
    navigate('/dashboard');
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className={`p-6 rounded-xl border bg-[#0f172a]/60 border-white/5 shadow-sm`}>
        <h2 className={`text-lg font-bold mb-6 flex items-center text-white`}>
          <Icons.Settings className="mr-2 text-indigo-500" style={{ width: 20, height: 20 }} /> Brand Setup & Configuration
        </h2>
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">Primary Brand Name</label>
            <input type="text" value={brandConfig.primaryBrand} onChange={(e) => setBrandConfig({ primaryBrand: e.target.value })} className={`w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500`} placeholder="e.g. Acme Corp" />
          </div>
          <div>
            <label className="block text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">Industry / Category</label>
            <input type="text" value={brandConfig.industry} onChange={(e) => setBrandConfig({ industry: e.target.value })} className={`w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500`} placeholder="e.g. AI Agents, Dev Tools" />
          </div>
          <div>
            <label className="block text-xs font-bold text-rose-500 uppercase tracking-wider mb-2">Competitors (Comma Separated)</label>
            <input type="text" value={brandConfig.competitors.join(', ')} onChange={(e) => setBrandConfig({ competitors: e.target.value.split(',').map(s => s.trim()) })} className={`w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500`} placeholder="e.g. Competitor A, Competitor B" />
          </div>
          <div>
            <label className="block text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">Target Keywords (Comma Separated)</label>
            <input type="text" value={brandConfig.keywords.join(', ')} onChange={(e) => setBrandConfig({ keywords: e.target.value.split(',').map(s => s.trim()) })} className={`w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500`} placeholder="e.g. workflow, automation, rpa" />
          </div>
          <div>
            <label className="block text-xs font-bold text-purple-500 uppercase tracking-wider mb-2">Common Search Terms (Comma Separated)</label>
            <input type="text" value={brandConfig.searchTerms.join(', ')} onChange={(e) => setBrandConfig({ searchTerms: e.target.value.split(',').map(s => s.trim()) })} className={`w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500`} placeholder="e.g. best automation tools, how to build workflows" />
          </div>
        </div>

        <h2 className={`text-lg font-bold mt-10 mb-6 flex items-center text-white`}>
          <Icons.Target className="mr-2 text-fuchsia-500" style={{ width: 20, height: 20 }} /> Search Providers & API Keys
        </h2>
        <div className="space-y-4">
          <p className="text-sm text-gray-400 mb-4">Provide API keys for your preferred LLM providers. If no key is provided, Gemini will be used as the default backend logic.</p>
          {providers.map((p, idx) => (
            <div key={p.id} className="flex items-center gap-4 bg-black/20 border border-white/10 rounded-lg p-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">{p.name}</label>
                <input
                  type="password"
                  value={p.apiKey === 'internal' ? '' : p.apiKey}
                  onChange={(e) => {
                    const newProviders = [...providers];
                    newProviders[idx].apiKey = e.target.value;
                    if (e.target.value) newProviders[idx].status = 'connected';
                    setProviders(newProviders);
                  }}
                  className={`w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-fuchsia-500`}
                  placeholder={p.apiKey === 'internal' ? 'Built-in' : 'Enter API Key...'}
                  disabled={p.apiKey === 'internal'}
                />
              </div>
              <div className="flex items-center pt-5">
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={p.enabled} onChange={(e) => {
                      const newProviders = [...providers];
                      newProviders[idx].enabled = e.target.checked;
                      setProviders(newProviders);
                    }} />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${p.enabled ? 'bg-fuchsia-500' : 'bg-gray-600'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${p.enabled ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg transition-all text-sm uppercase tracking-wider">Save Configuration</button>
        </div>
      </div>
    </div>
  );
};
