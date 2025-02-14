/// <reference types="bun-types" />
import type { HealthResponse } from "@ensnode/ensrainbow-sdk/types";
import { ENSRainbowDB, exitIfIncompleteIngestion, openDatabase } from "../lib/database";
import { ENSRainbowServer } from "../lib/server";
import { LogLevel, Logger, createLogger } from "../utils/logger";

export interface ServerCommandOptions {
  dataDir: string;
  port: number;
  logLevel: LogLevel;
}

/**
 * Creates and configures the ENS Rainbow server application
 */
export function createServer(db: ENSRainbowDB, log: Logger, logLevel: LogLevel = "info") {
  const rainbow = new ENSRainbowServer(db, logLevel);

  return {
    fetch: async (request: Request): Promise<Response> => {
      const url = new URL(request.url);
      const path = url.pathname;

      // Health check endpoint
      if (path === "/health") {
        log.debug("Health check request");
        const result: HealthResponse = { status: "ok" };
        return Response.json(result);
      }

      // Label count endpoint
      if (path === "/v1/labels/count") {
        log.debug("Label count request");
        const result = await rainbow.labelCount();
        log.debug(`Count result:`, result);
        return Response.json(result, { status: result.errorCode });
      }

      // Heal endpoint
      const healMatch = path.match(/^\/v1\/heal\/(?<labelhash>0x[a-f0-9]+)$/);
      if (healMatch?.groups) {
        const labelhash = healMatch.groups.labelhash as `0x${string}`;
        log.debug(`Healing request for labelhash: ${labelhash}`);
        const result = await rainbow.heal(labelhash);
        log.debug(`Heal result:`, result);
        return Response.json(result, { status: result.errorCode });
      }

      // Not found for any other path
      return new Response("404 Not Found", { status: 404 });
    }
  };
}

export async function serverCommand(options: ServerCommandOptions): Promise<void> {
  const log = createLogger(options.logLevel);
  const db = await openDatabase(options.dataDir, options.logLevel);

  // Check for incomplete ingestion
  await exitIfIncompleteIngestion(db, log);

  const server = createServer(db, log, options.logLevel);

  log.info(`ENS Rainbow server starting on port ${options.port}...`);

  const bunServer = Bun.serve({
    port: options.port,
    fetch: server.fetch
  });

  // Handle graceful shutdown
  const shutdown = async () => {
    log.info("Shutting down server...");
    try {
      bunServer.stop();
      await db.close();
      log.info("Server shutdown complete");
      process.exit(0);
    } catch (error) {
      log.error("Error during shutdown:", error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
