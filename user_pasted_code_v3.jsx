import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// --- GLOBAL SETTINGS ---
const defaultApiKey = ""; 

// --- UTILITY FUNCTIONS ---
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

function queryDocumentSimilarity(baseQuery, variantQuery, doc) {
  const stops = new Set(['the','is','in','and','to','of','a','for','on','with','how','why','what','where','when','does','do','it','my','i','you', 'are']);
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

function generateSemant
<truncated 45216 bytes>
P scraping.", inputSchema: { type: "object", properties: { query: { type: "string"} }, required: ["query"] } }]);
             setMcpLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Server exposed local adapter tools.`]);
          }, 800);
       }, 1000);
       return;
     }
  };

  const disconnectMCP = () => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    setMcpStatus('disconnected'); setMcpTools([]); setMcpLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Disconnected from MCP server.`]);
  };

  const mcpCallTool = async (toolName, args, traceId = null) => {
    const startTime = Date.now();
    setMcpLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] -> Calling tool: ${toolName}...`]);
    if (traceId) setExecutionTraces(prev => [...prev, { id: traceId, tool: toolName, status: 'running', time: 0 }]);
    try {
      let result;
      if (isSimulatedMcp) {
         result = { text: "Local Tool Execution Successful", source: "Local Sandbox" };
      } else {
         const remoteRes = await sendMcpRequest('tools/call', { name: toolName, arguments: args });
         if (remoteRes.content && remoteRes.content[0]?.text) {
             try { result = JSON.parse(remoteRes.content[0].text); } 
             catch(e) { result = { text: remoteRes.content[0].text, source: "Remote MCP Server" }; }
         } else result = remoteRes;
      }
      const duration = Date.now() - startTime;
      setMcpLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] <- [Success] ${toolName} executed in ${duration}ms`]);
      if (traceId) setExecutionTraces(prev => prev.map(t => t.id === traceId ? { ...t, status: 'success', time: duration, data: result } : t));
      return result;
    } catch (err) {
      const duration = Date.now() - startTime;
      setMcpLogs(prev => [...prev, `[${new Date().toLocaleT
<truncated 152165 bytes>

NOTE: The output was truncated because it was too long. Use a more targeted query or a smaller range to get the information you need.