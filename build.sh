#!/bin/bash

set -e

echo "🔨 Building Docker image..."
docker build -t openproject-mcp-fastmcp:latest -f docker/Dockerfile .

echo "💾 Exporting image to tar..."
docker save -o openproject-mcp-fastmcp.tar openproject-mcp-fastmcp:latest

echo "✅ Done!"
echo ""
echo "Image saved to: openproject-mcp-fastmcp.tar"
echo ""
echo "📤 To import in Portainer:"
echo "   1. Go to Portainer → Images"
echo "   2. Click 'Import image'"
echo "   3. Upload openproject-mcp-fastmcp.tar"
echo "   4. Then use docker-compose.yml to deploy"
