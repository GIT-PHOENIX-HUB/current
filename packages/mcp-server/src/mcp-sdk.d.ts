// Type declarations for @modelcontextprotocol/sdk subpaths
declare module '@modelcontextprotocol/sdk/server/stdio' {
  import { Readable, Writable } from 'node:stream';
  export class StdioServerTransport {
    constructor(stdin?: Readable, stdout?: Writable);
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: unknown) => void;
    start(): Promise<void>;
    close(): Promise<void>;
    send(message: unknown): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/types' {
  import { z } from 'zod';
  export const CallToolRequestSchema: z.ZodType<any>;
  export const ListToolsRequestSchema: z.ZodType<any>;
}
