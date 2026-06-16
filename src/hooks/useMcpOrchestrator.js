import { useState, useRef, useEffect, useCallback } from 'react';

export const useMcpOrchestrator = () => {
  const wsRef = useRef(null);
  const pendingRequests = useRef(new Map());
  const messageIdRef = useRef(1);

  const [mcpUrl, setMcpUrl] = useState('http://localhost:8080/sse');
  const [mcpStatus, setMcpStatus] = useState('disconnected');
  const [mcpTools, setMcpTools] = useState([]);
  const [mcpLogs, setMcpLogs] = useState([]);
  const [isSimulatedMcp, setIsSimulatedMcp] = useState(true);
  const [toolArgs, setToolArgs] = useState({});
  const [executionTraces, setExecutionTraces] = useState([]);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const sendMcpRequest = useCallback((method, params = {}) => {
    return new Promise((resolve, reject) => {
      const id = (messageIdRef.current++).toString();
      pendingRequests.current.set(id, { resolve, reject, timestamp: Date.now() });

      const payload = { jsonrpc: "2.0", method, params, id };

      if (isSimulatedMcp) {
        setMcpLogs(prev => [...prev, `[SIMULATED] -> ${method}`]);
        setTimeout(() => {
          const req = pendingRequests.current.get(id);
          if (req) {
            req.resolve({ id, result: { simulated: true, method } });
            pendingRequests.current.delete(id);
            setMcpLogs(prev => [...prev, `[SIMULATED] <- ${method} Success`]);
          }
        }, 800);
        return;
      }

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
        setMcpLogs(prev => [...prev, `-> ${method} (ID: ${id})`]);
      } else {
        pendingRequests.current.delete(id);
        reject(new Error("WebSocket not connected"));
      }
    });
  }, [isSimulatedMcp]);

  const connectToMcp = useCallback(async () => {
    if (isSimulatedMcp) {
      setMcpStatus('connected');
      setMcpTools([
        { name: "reddit_insight_fetcher", description: "Fetch metrics directly from Reddit APIs" },
        { name: "llm_visibility_scorer", description: "Score content against internal LLM ingestion heuristics" },
        { name: "semantic_cluster_analyzer", description: "Group keywords into visibility clusters" }
      ]);
      setMcpLogs(prev => [...prev, "[SIMULATED] Connected to Virtual MCP Server"]);
      return;
    }

    try {
      setMcpStatus('connecting');
      const wsUrl = mcpUrl.replace('http', 'ws');
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setMcpStatus('connected');
        setMcpLogs(prev => [...prev, "WebSocket connected."]);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.id && pendingRequests.current.has(msg.id)) {
            const { resolve, reject } = pendingRequests.current.get(msg.id);
            pendingRequests.current.delete(msg.id);
            if (msg.error) {
              reject(msg.error);
              setMcpLogs(prev => [...prev, `<- Error (ID: ${msg.id}): ${msg.error.message}`]);
            } else {
              resolve(msg);
              setMcpLogs(prev => [...prev, `<- Success (ID: ${msg.id})`]);
            }
          } else if (msg.method === 'notifications/tools/list_changed') {
            setMcpLogs(prev => [...prev, "Tools list changed notification received."]);
          }
        } catch (err) {
          console.error("Message parsing error:", err);
        }
      };

      ws.onerror = (err) => {
        setMcpStatus('error');
        setMcpLogs(prev => [...prev, "WebSocket Error"]);
      };

      ws.onclose = () => {
        setMcpStatus('disconnected');
        setMcpLogs(prev => [...prev, "WebSocket disconnected."]);
      };

      wsRef.current = ws;
    } catch (err) {
      setMcpStatus('error');
      setMcpLogs(prev => [...prev, `Connection failed: ${err.message}`]);
    }
  }, [mcpUrl, isSimulatedMcp]);

  return {
    mcpUrl,
    setMcpUrl,
    mcpStatus,
    mcpTools,
    mcpLogs,
    setMcpLogs,
    isSimulatedMcp,
    setIsSimulatedMcp,
    toolArgs,
    setToolArgs,
    executionTraces,
    setExecutionTraces,
    sendMcpRequest,
    connectToMcp,
    disconnectFromMcp: () => {
      if (wsRef.current) wsRef.current.close();
      if (isSimulatedMcp) {
        setMcpStatus('disconnected');
        setMcpLogs(prev => [...prev, "[SIMULATED] Disconnected from Virtual MCP Server"]);
      }
    }
  };
};
