# FastMCP HTTP Proxy for OpenProject MCP

HTTP proxy using FastMCP to expose OpenProject MCP Server with HTTP/JSON endpoints and Swagger UI.

## Setup

```bash
npm install
npm run build
```

## Environment Variables

- `OPENPROJECT_BASE_URL` - OpenProject instance URL (required)
- `OPENPROJECT_API_KEY` - OpenProject API key (required)
- `MCP_PORT` - HTTP server port (default: 8000)
- `LOG_LEVEL` - Logging level: info/debug/silent (default: info)

## Running

```bash
npm start
```

## Docker

```bash
docker build -t openproject-mcp-fastmcp:latest .
docker run -e OPENPROJECT_BASE_URL=https://your-instance.com \
           -e OPENPROJECT_API_KEY=your-key \
           -p 8000:8000 \
           openproject-mcp-fastmcp:latest
```

## API Endpoints

- `GET /health` - Health check
- `GET /tools` - List available tools
- `POST /tools/{toolName}/call` - Execute tool
- `GET /api-docs` - Swagger UI
- `GET /openapi.json` - OpenAPI spec
