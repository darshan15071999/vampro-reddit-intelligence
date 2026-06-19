import codecs
import re

app_path = r'c:\Users\rosha\Documents\vampro-aeo-tracker\src\App.jsx'

with codecs.open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'useNavigate' not in content:
    content = content.replace("import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';", 
                              "import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';\nimport { useNavigate, useLocation } from 'react-router-dom';")

# Replace activeTab state with useLocation
if "const [activeTab, setActiveTab] = useState('brand_setup');" in content:
    content = content.replace("const [activeTab, setActiveTab] = useState('brand_setup');", "")
    content = content.replace("const navItems = [", """
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [""")
    
    # Update navItems with paths
    navItems_replacement = """const navItems = [
    { id: 'dashboard', label: 'Overview Dashboard', icon: Icons.Activity, path: '/dashboard' },
    { id: 'search_monitor', label: 'AI Search Monitoring', icon: Icons.Target, path: '/monitor' },
    { id: 'sov_analysis', label: 'Share of Voice', icon: Icons.PieChart, path: '/sov' },
    { id: 'subreddit_suggester', label: 'Subreddit Suggester', icon: Icons.PenTool, path: '/suggester' },
    { id: 'competitor_analyzer', label: 'Competitor Mentions', icon: Icons.Crosshair, path: '/competitors' },
    { id: 'spotlight', label: 'Feature Spotlight', icon: Icons.Star, path: '/spotlight' },
    { id: 'analytics', label: 'Platform Citations', icon: Icons.BarChart, path: '/analytics' },
    { id: 'query', label: 'Query Tester', icon: Icons.Terminal, path: '/query' },
    { id: 'mcp_integration', label: 'MCP Connect & Observe', icon: Icons.Plug, path: '/mcp' },
    { id: 'posts', label: 'Indexed Posts', icon: Icons.Layers, path: '/posts' },
    { id: 'settings', label: 'Architecture & Settings', icon: Icons.Settings, path: '/settings' }
  ];
  
  const activeTab = location.pathname === '/' ? 'brand_setup' : navItems.find(i => i.path === location.pathname)?.id || 'brand_setup';
  const setActiveTab = (id) => {
    if (id === 'brand_setup') navigate('/');
    else {
      const item = navItems.find(i => i.id === id);
      if (item) navigate(item.path);
    }
  };
"""
    content = re.sub(r'const navItems = \[.*?\];', navItems_replacement, content, flags=re.DOTALL)


with codecs.open(app_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Router migration script complete.")
