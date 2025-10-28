import express, { Request, Response, NextFunction } from "express";
import swaggerUi from "swagger-ui-express";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

const app = express();
const PORT = parseInt(process.env.MCP_PORT || "8000");
const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const BASE_URL = process.env.OPENPROJECT_BASE_URL;
const API_KEY = process.env.OPENPROJECT_API_KEY;

// Validate environment
if (!BASE_URL || !API_KEY) {
  console.error(
    "Missing required environment variables: OPENPROJECT_BASE_URL and OPENPROJECT_API_KEY"
  );
  process.exit(1);
}

// Middleware
app.use(express.json());

// Logging middleware
app.use((_req: Request, _res: Response, next: NextFunction) => {
  if (LOG_LEVEL !== "silent") {
    console.log(`[${new Date().toISOString()}] ${_req.method} ${_req.path}`);
  }
  next();
});

// OpenAPI/Swagger spec
const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "OpenProject MCP Server",
    description:
      "Model Context Protocol server for OpenProject with HTTP interface",
    version: "1.0.0",
  },
  servers: [
    {
      url: `http://localhost:${PORT}`,
      description: "Local server",
    },
  ],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        tags: ["Health"],
        responses: {
          "200": {
            description: "Server is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    timestamp: {
                      type: "string",
                      format: "date-time",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/tools": {
      get: {
        summary: "List available tools",
        tags: ["Tools"],
        responses: {
          "200": {
            description: "List of available tools",
          },
        },
      },
    },
    "/tools/{toolName}/call": {
      post: {
        summary: "Execute a tool",
        tags: ["Tools"],
        parameters: [
          {
            name: "toolName",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Tool execution result",
          },
        },
      },
    },
  },
};

// Global state
let mcpClient: Client | null = null;

// Routes

/**
 * Health check endpoint
 */
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

/**
 * List available tools
 */
app.get("/tools", async (_req: Request, res: Response) => {
  try {
    if (!mcpClient) {
      res.status(503).json({
        error: "MCP client not initialized",
      });
      return;
    }

    const tools = await mcpClient.listTools();
    res.json(tools.tools || []);
  } catch (error) {
    console.error("Error listing tools:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Execute a tool
 */
app.post("/tools/:toolName/call", async (req: Request, res: Response) => {
  try {
    const { toolName } = req.params;
    const toolArgs = (req.body || {}) as Record<string, unknown>;

    if (!mcpClient) {
      res.status(503).json({
        error: "MCP client not initialized",
      });
      return;
    }

    const result = await mcpClient.callTool(
      { name: toolName, arguments: toolArgs },
    );
    res.json({
      toolName,
      result,
    });
  } catch (error) {
    console.error("Error calling tool:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Swagger UI endpoint
 */
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

/**
 * OpenAPI spec endpoint
 */
app.get("/openapi.json", (_req: Request, res: Response) => {
  res.json(openApiSpec);
});

/**
 * Root endpoint
 */
app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "openproject-mcp-http-proxy",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      tools: "/tools",
      toolCall: "/tools/{toolName}/call",
      docs: "/api-docs",
      openapi: "/openapi.json",
    },
  });
});

/**
 * Error handling middleware
 */
app.use(
  (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
      error: err.message || "Internal server error",
    });
  }
);

/**
 * Initialize and start server
 */
async function start() {
  try {
    console.log("[HTTP] Initializing MCP client...");

    // Create stdio transport to connect to the MCP server subprocess
    const transport = new StdioClientTransport({
      command: "node",
      args: ["mcp-openproject/dist/index.js"],
      env: {
        ...process.env,
        OPENPROJECT_BASE_URL: BASE_URL || "",
        OPENPROJECT_API_KEY: API_KEY || "",
      },
    });

    // Initialize client
    mcpClient = new Client({
      name: "openproject-mcp-http-proxy",
      version: "1.0.0",
    });

    await mcpClient.connect(transport);
    console.log("[HTTP] MCP client connected");

    // List tools
    const toolsList = await mcpClient.listTools();
    console.log(
      `[HTTP] Found ${toolsList.tools?.length || 0} tools available`
    );

    // Start Express server
    app.listen(PORT, () => {
      console.log(`[HTTP] Server running on http://localhost:${PORT}`);
      console.log(
        `[HTTP] API Documentation available at http://localhost:${PORT}/api-docs`
      );
    });
  } catch (error) {
    console.error("[HTTP] Startup failed:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("[HTTP] Shutting down gracefully...");
  if (mcpClient) {
    try {
      await mcpClient.close();
    } catch (error) {
      console.error("[HTTP] Error closing MCP client:", error);
    }
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("[HTTP] Shutting down gracefully...");
  if (mcpClient) {
    try {
      await mcpClient.close();
    } catch (error) {
      console.error("[HTTP] Error closing MCP client:", error);
    }
  }
  process.exit(0);
});

// Start the application
start().catch((error) => {
  console.error("[HTTP] Fatal error:", error);
  process.exit(1);
});
