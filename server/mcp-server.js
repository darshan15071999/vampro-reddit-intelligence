import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/sse", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });

  res.write(`data: ${JSON.stringify({
    type: "connected",
    server: "AEO MCP Server"
  })}\n\n`);
});

app.post("/mcp", async (req, res) => {
  const body = req.body;

  console.log("MCP Request:", body);

  if (body.method === "tools/list") {
    return res.json({
      jsonrpc: "2.0",
      id: body.id,
      result: {
        tools: [
          {
            name: "search_reddit_visibility",
            description: "Analyze Reddit AI visibility"
          },
          {
            name: "openai_chat",
            description: "Run ChatGPT queries"
          }
        ]
      }
    });
  }

  if (body.method === "tools/call") {
  const toolName = body.params?.name;
  const args = body.params?.arguments || {};

  console.log("Executing tool:", toolName);
  console.log("Arguments:", args);

  if (toolName === "openai_chat") {
    return res.json({
      jsonrpc: "2.0",
      id: body.id,
      result: {
        content: [
          {
            type: "text",
            text: `Mock OpenAI response for query: ${args.query}`
          }
        ]
      }
    });
  }

  if (toolName === "deep_serp_search") {
    return res.json({
      jsonrpc: "2.0",
      id: body.id,
      result: {
        content: [
          {
            type: "text",
            text: `Mock SERP results for: ${args.query}`
          }
        ]
      }
    });
  }

  return res.json({
    jsonrpc: "2.0",
    id: body.id,
    result: {
      content: [
        {
          type: "text",
          text: `Unknown tool: ${toolName}`
        }
      ]
    }
  });
}

  res.json({
    jsonrpc: "2.0",
    id: body.id,
    result: {}
  });
});

app.listen(8080, () => {
  console.log("MCP HTTP Server running on http://localhost:8080");
});