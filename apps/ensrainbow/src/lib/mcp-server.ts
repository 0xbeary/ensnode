import {
  type EnsRainbow,
  type LabelSetId,
  type LabelSetVersion,
  buildEnsRainbowClientLabelSet,
  buildLabelSetId,
  buildLabelSetVersion,
} from "@ensnode/ensrainbow-sdk";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  type CallToolRequest,
  CallToolRequestSchema,
  type ListToolsRequest,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import packageJson from "@/../package.json";
import { ENSRainbowServer } from "@/lib/server";
import { logger } from "@/utils/logger";
import { DB_SCHEMA_VERSION } from "@/lib/database";

/**
 * Creates an MCP Server that exposes ENSRainbow functionality as tools
 */
export function createENSRainbowMCPServer(ensRainbowServer: ENSRainbowServer): Server {
  const server = new Server(
    {
      name: "ensrainbow-mcp",
      version: packageJson.version,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "heal",
          description: "Heal an ENS labelhash to recover the original label text using ENSRainbow",
          inputSchema: {
            type: "object",
            properties: {
              labelhash: {
                type: "string",
                description: "The labelhash to heal (hex string starting with 0x)",
                pattern: "^0x[a-fA-F0-9]{64}$",
              },
              labelSetId: {
                type: "string",
                description: "Optional label set ID to use for healing",
              },
              labelSetVersion: {
                type: "string",
                description: "Optional label set version (non-negative integer as string)",
              },
            },
            required: ["labelhash"],
          },
        },
        {
          name: "count",
          description: "Get the total count of labels available in the ENSRainbow database",
          inputSchema: {
            type: "object",
            properties: {},
            required: [],
          },
        },
        {
          name: "version",
          description: "Get version information about the ENSRainbow server and database schema",
          inputSchema: {
            type: "object",
            properties: {},
            required: [],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "heal": {
          const { labelhash, labelSetId, labelSetVersion } = args as {
            labelhash: string;
            labelSetId?: string;
            labelSetVersion?: string;
          };

          // Validate labelhash format
          if (!labelhash || !labelhash.match(/^0x[a-fA-F0-9]{64}$/)) {
            throw new Error(
              "Invalid labelhash format. Must be a 64-character hex string starting with 0x",
            );
          }

          // Build client label set
          let parsedLabelSetVersion: LabelSetVersion | undefined;
          let parsedLabelSetId: LabelSetId | undefined;

          try {
            if (labelSetVersion) {
              parsedLabelSetVersion = buildLabelSetVersion(labelSetVersion);
            }
            if (labelSetId) {
              parsedLabelSetId = buildLabelSetId(labelSetId);
            }
          } catch (error) {
            throw new Error(`Invalid label set parameters: ${(error as Error).message}`);
          }

          const clientLabelSet = buildEnsRainbowClientLabelSet(
            parsedLabelSetId,
            parsedLabelSetVersion,
          );

          logger.debug(`MCP heal request for labelhash: ${labelhash}`, { clientLabelSet });

          const result = await ensRainbowServer.heal(labelhash as `0x${string}`, clientLabelSet);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "count": {
          logger.debug("MCP count request");
          const result = await ensRainbowServer.labelCount();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "version": {
          logger.debug("MCP version request");
          const result: EnsRainbow.VersionResponse = {
            status: "success",
            versionInfo: {
              version: packageJson.version,
              dbSchemaVersion: DB_SCHEMA_VERSION,
              labelSet: ensRainbowServer.getServerLabelSet(),
            },
          };

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      logger.error("MCP tool error:", error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "error",
                error: (error as Error).message,
                tool: name,
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}
