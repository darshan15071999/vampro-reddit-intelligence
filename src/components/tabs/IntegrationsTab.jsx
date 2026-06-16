import React, { useState, useEffect } from 'react';
import { Icons } from '../common/Icons';
import { storage } from '../../utils/storage';

const LLM_PROVIDERS = [
  { id: 'openai', name: 'ChatGPT (OpenAI)', icon: Icons.Cpu, default: false },
  { id: 'anthropic', name: 'Claude (Anthropic)', icon: Icons.Cpu, default: false },
  { id: 'gemini', name: 'Gemini (Google)', icon: Icons.Cpu, default: true, note: 'Default Fallback AI' },
  { id: 'perplexity', name: 'Perplexity AI', icon: Icons.Search, default: false },
  { id: 'deepseek', name: 'DeepSeek', icon: Icons.Cpu, default: false },
  { id: 'grok', name: 'Grok (xAI)', icon: Icons.Cpu, default: false }
];

export const IntegrationsTab = () => {
  const [connections, setConnections] = useState({});
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState({});

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = () => {
    try {
      const data = storage.getProviders();
      const connMap = {};
      Object.keys(data).forEach(providerId => {
        if (data[providerId] && data[providerId].apiKey) {
          connMap[providerId] = 'Connected';
        }
      });
      setConnections(connMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (providerId) => {
    const key = keys[providerId];
    if (!key) return alert('Please enter an API key');
    
    try {
      const success = storage.saveProvider(providerId, key);
      if (success) {
        setKeys({ ...keys, [providerId]: '' });
        fetchConnections();
      } else {
        alert('Failed to save API key to local storage.');
      }
    } catch (err) {
      alert('Failed to connect');
    }
  };

  if (loading) return <div className="text-white p-8">Loading integrations...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">LLM Integrations</h2>
        <p className="text-sm text-gray-400 mt-1">Securely connect your AI agents. Keys are vaulted locally in your browser. If no agents are connected, the system uses Gemini AI as a fallback alongside heuristic logic.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {LLM_PROVIDERS.map(provider => {
          const isConnected = connections[provider.id] === 'Connected';
          return (
            <div key={provider.id} className="bg-[#111827] border border-white/5 rounded-2xl p-6 shadow-lg flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-gray-400'}`}>
                    <provider.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{provider.name}</h3>
                    {provider.note && <span className="text-[10px] text-indigo-400 font-medium">{provider.note}</span>}
                  </div>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-500'}`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              {!isConnected ? (
                <div className="mt-auto space-y-3">
                  <input 
                    type="password" 
                    placeholder="Enter API Key" 
                    value={keys[provider.id] || ''}
                    onChange={(e) => setKeys({...keys, [provider.id]: e.target.value})}
                    className="w-full bg-[#080B14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <button 
                    onClick={() => handleConnect(provider.id)}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                  >
                    Connect Provider
                  </button>
                </div>
              ) : (
                <div className="mt-auto">
                  <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded text-center">
                    Key securely vaulted locally
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
