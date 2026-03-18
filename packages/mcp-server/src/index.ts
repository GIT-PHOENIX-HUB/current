import { Server } from '@modelcontextprotocol/sdk/server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { createLogger } from '@phoenix/shared';
import { getClient, ServiceFusionClient } from './client.js';
import { createAllTools, getToolByName, getActiveTools } from './tools/index.js';

// Re-export for use by other packages
export { getClient, ServiceFusionClient, resetClient } from './client.js';
export type { RequestOptions } from './client.js';
export { RateLimiter } from './rate-limiter.js';
export { ResponseCache } from './cache.js';

// Re-export tool utilities
export { createAllTools, getToolByName, getToolsByCategory, getProtectedTools, getActiveTools, getDeprecatedTools } from './tools/index.js';
export type { Tool } from './tools/index.js';

const logger = createLogger('servicefusion-mcp');

// =============================================================================
// Server Factory
// =============================================================================

export interface MCPServerOptions {
  /** Transport mode: 'stdio' for CLI, 'http' for Express/HTTP endpoint. Default: 'stdio' */
  transport?: 'stdio' | 'http';
  /** Port for HTTP mode. Default: 3100 */
  port?: number;
  /** Host for HTTP mode. Default: '127.0.0.1' */
  host?: string;
  /** Pre-configured SF client (uses singleton if omitted) */
  client?: ServiceFusionClient;
}

export interface MCPServerInstance {
  server: Server;
  transport: Transport;
  /** The StreamableHTTPServerTransport instance (only available in HTTP mode) */
  httpTransport?: StreamableHTTPServerTransport;
  /** Shuts down the server and transport */
  close: () => Promise<void>;
}

/**
 * Creates a configured MCP server with tool handlers wired up.
 * Returns the server, transport, and a close() function.
 *
 * Use 'stdio' transport for Claude Code (`--mcp` flag).
 * Use 'http' transport for Gateway or other HTTP-based consumers.
 */
export async function createMCPServer(options: MCPServerOptions = {}): Promise<MCPServerInstance> {
  const { transport: mode = 'stdio', client: providedClient } = options;

  // Initialize client
  const sfClient = providedClient ?? getClient();
  await sfClient.initialize();

  // Register tools
  const allTools = createAllTools(sfClient);
  const activeTools = getActiveTools(allTools);
  const deprecatedCount = allTools.length - activeTools.length;
  logger.info({ activeTools: activeTools.length, deprecatedStubs: deprecatedCount }, 'Tools registered');

  // Create MCP server
  const server = new Server(
    { name: 'servicefusion-mcp', version: '2.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(t.inputSchema),
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const tool = getToolByName(allTools, name);

    if (!tool) {
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }

    try {
      const validated = tool.inputSchema.parse(args);
      const result = await tool.handler(validated);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error({ tool: name, error: msg }, 'Tool execution failed');
      return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true };
    }
  });

  // Connect transport
  if (mode === 'http') {
    const httpTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });
    await server.connect(httpTransport);
    logger.info('MCP server connected via StreamableHTTP transport');

    return {
      server,
      transport: httpTransport,
      httpTransport,
      close: async () => {
        await httpTransport.close();
        await server.close();
      },
    };
  }

  // Default: stdio
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
  logger.info('MCP server connected via stdio transport');

  return {
    server,
    transport: stdioTransport,
    close: async () => {
      await stdioTransport.close();
      await server.close();
    },
  };
}

// =============================================================================
// HTTP Server (Express)
// =============================================================================

/**
 * Starts the MCP server as an HTTP endpoint using Express.
 * Handles POST/GET /mcp for MCP Streamable HTTP protocol.
 */
export async function startHTTPServer(options: Omit<MCPServerOptions, 'transport'> = {}): Promise<void> {
  const { default: express } = await import('express');
  const port = options.port ?? 3100;
  const host = options.host ?? '127.0.0.1';

  const { httpTransport, close } = await createMCPServer({ ...options, transport: 'http' });

  if (!httpTransport) {
    throw new Error('HTTP transport not available');
  }

  const app = express();
  app.use(express.json());

  // MCP endpoint — handles both GET (SSE stream) and POST (messages)
  app.all('/mcp', async (req, res) => {
    await httpTransport.handleRequest(req, res, req.body);
  });

  // Health endpoint
  app.get('/health', async (_req, res) => {
    const sfClient = options.client ?? getClient();
    const health = await sfClient.healthCheck();
    res.json({ status: health.authenticated ? 'ok' : 'degraded', ...health });
  });

  const httpServer = app.listen(port, host, () => {
    logger.info({ host, port }, 'Service Fusion MCP HTTP server listening');
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down HTTP server...');
    httpServer.close();
    await close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// =============================================================================
// CLI Entry Point
// =============================================================================

async function main() {
  const mode = process.argv.includes('--http') ? 'http' : 'stdio';
  const port = parseInt(process.env.MCP_PORT ?? '3100', 10);
  const host = process.env.MCP_HOST ?? '127.0.0.1';

  logger.info({ mode }, 'Starting Service Fusion MCP Server (v1 API)...');

  if (mode === 'http') {
    await startHTTPServer({ port, host });
  } else {
    const { close } = await createMCPServer({ transport: 'stdio' });

    // Graceful shutdown for stdio mode
    const shutdown = async () => {
      logger.info('Shutting down...');
      await close();
      getClient().destroy();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
}

// Only run main() when executed directly, not when imported
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
                     process.argv[1]?.endsWith('servicefusion-mcp');

if (isMainModule) {
  main().catch((e) => {
    console.error('Service Fusion MCP Server fatal error:', e);
    process.exit(1);
  });
}

// Export for programmatic use
export { main as startServer };
