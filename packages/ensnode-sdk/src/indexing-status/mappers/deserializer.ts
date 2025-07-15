import * as z from "zod/v4";
import { ENSNode } from "../../ensnode";
import { IndexingStatusDomain } from "../domain/types";
import { IndexingStatusDTO } from "../dto/types";

const ChainIdSchema = z.number().int().min(1);

const PositiveIntegerSchema = z.coerce
  .number({ error: `Value must be a positive integer.` })
  .int({ error: `Value must be a positive integer.` })
  .min(0, { error: `Value must be a positive integer.` });

// Partial BlockInfo schema that only has number
const PartialBlockInfoSchema = z.object({
  number: PositiveIntegerSchema,
});

// Full BlockInfo schema that always produces a complete BlockInfo
const FullBlockInfoSchema = z.object({
  number: PositiveIntegerSchema,
  createdAt: z.iso.datetime().transform((v) => new Date(v)),
});

// Base chain status properties
const ChainStatusBaseSchema = z.object({
  chainId: ChainIdSchema,
});

// Define schemas for each specific combination of ChainStatus

// Permutation ID: 1 - RPC Unhealthy + Sync Queued
const RpcUnhealthySyncQueuedSchema = ChainStatusBaseSchema.extend({
  indexingPhase: z.literal(ENSNode.IndexingPhase.SyncQueued),
  rpcHealth: z.literal(ENSNode.RPCHealth.Unhealthy),
  firstBlockToIndex: PartialBlockInfoSchema, // Only partial block info available
  lastSyncedBlock: z.null(),
  lastIndexedBlock: z.null(),
  latestSafeBlock: z.null(),
});

// Permutation ID: 2 - RPC Healthy + Sync Queued
const RpcHealthySyncQueuedSchema = ChainStatusBaseSchema.extend({
  indexingPhase: z.literal(ENSNode.IndexingPhase.SyncQueued),
  rpcHealth: z.literal(ENSNode.RPCHealth.Healthy),
  firstBlockToIndex: FullBlockInfoSchema, // Full block info available
  lastSyncedBlock: z.null(),
  lastIndexedBlock: z.null(),
  latestSafeBlock: FullBlockInfoSchema, // Full block info available
});

// Permutation ID: 3 - RPC Unhealthy + Indexing Queued
// TODO: Address the following: if we could have Ponder to cache full block
//       information (number & date) in the RPC cache then we could serve
//       full block info for `firstBlockToIndex` and `lastSyncedBlock`.
const RpcUnhealthyIndexingQueuedSchema = ChainStatusBaseSchema.extend({
  indexingPhase: z.literal(ENSNode.IndexingPhase.IndexingQueued),
  rpcHealth: z.literal(ENSNode.RPCHealth.Unhealthy),
  firstBlockToIndex: FullBlockInfoSchema, // Full block info available
  lastSyncedBlock: FullBlockInfoSchema, // Full block info available
  lastIndexedBlock: z.null(),
  latestSafeBlock: z.null(),
}).refine((v) => v.lastSyncedBlock.number >= v.firstBlockToIndex.number, {
  error: "`lastSyncedBlock.number` must be greater than or equal to `firstBlockToIndex.number`",
});

// Permutation ID: 4 - RPC Healthy + Indexing Queued
const RpcHealthyIndexingQueuedSchema = ChainStatusBaseSchema.extend({
  indexingPhase: z.literal(ENSNode.IndexingPhase.IndexingQueued),
  rpcHealth: z.literal(ENSNode.RPCHealth.Healthy),
  firstBlockToIndex: FullBlockInfoSchema, // Full block info available
  lastSyncedBlock: FullBlockInfoSchema, // Full block info available
  lastIndexedBlock: z.null(),
  latestSafeBlock: FullBlockInfoSchema, // Full block info available
})
  .refine((v) => v.latestSafeBlock.number >= v.lastSyncedBlock.number, {
    error: "`latestSafeBlock.number` must be greater than or equal to `lastSyncedBlock.number`",
  })
  .refine((v) => v.lastSyncedBlock.number >= v.firstBlockToIndex.number, {
    error: "`lastSyncedBlock.number` must be greater than or equal to `firstBlockToIndex.number`",
  });

// Permutation ID: 5 - RPC Unhealthy + Indexing Started
// TODO: Address the following: if we could have Ponder to cache full block
//       information (number & date) in the RPC cache then we could serve
//       full block info for `firstBlockToIndex`, `lastSyncedBlock`, and `lastIndexedBlock`.
const RpcUnhealthyIndexingStartedSchema = ChainStatusBaseSchema.extend({
  indexingPhase: z.literal(ENSNode.IndexingPhase.IndexingStarted),
  rpcHealth: z.literal(ENSNode.RPCHealth.Unhealthy),
  firstBlockToIndex: FullBlockInfoSchema, // Full block info available
  lastSyncedBlock: FullBlockInfoSchema, // Full block info available
  lastIndexedBlock: FullBlockInfoSchema, // Full block info available
  latestSafeBlock: z.null(),
})
  .refine((v) => v.lastSyncedBlock.number >= v.lastIndexedBlock.number, {
    error: "`lastSyncedBlock.number` must be greater than or equal to `lastIndexedBlock.number`",
  })
  .refine((v) => v.lastIndexedBlock.number >= v.firstBlockToIndex.number, {
    error: "`lastIndexedBlock.number` must be greater than or equal to `firstBlockToIndex.number`",
  });

// Permutation ID: 6 - RPC Healthy + Indexing Started
const RpcHealthyIndexingStartedSchema = ChainStatusBaseSchema.extend({
  indexingPhase: z.literal(ENSNode.IndexingPhase.IndexingStarted),
  rpcHealth: z.literal(ENSNode.RPCHealth.Healthy),
  firstBlockToIndex: FullBlockInfoSchema, // Full block info available
  lastSyncedBlock: FullBlockInfoSchema, // Full block info available
  lastIndexedBlock: FullBlockInfoSchema, // Full block info available
  latestSafeBlock: FullBlockInfoSchema, // Full block info available
})
  .refine((v) => v.latestSafeBlock.number >= v.lastSyncedBlock.number, {
    error: "`latestSafeBlock.number` must be greater than or equal to `lastSyncedBlock.number`",
  })
  .refine((v) => v.lastSyncedBlock.number >= v.lastIndexedBlock.number, {
    error: "`lastSyncedBlock.number` must be greater than or equal to `lastIndexedBlock.number`",
  })
  .refine((v) => v.lastIndexedBlock.number >= v.firstBlockToIndex.number, {
    error: "`lastIndexedBlock.number` must be greater than or equal to `firstBlockToIndex.number`",
  });

// Union of all possible chain status schemas
const ChainStatusSchema = z.union([
  RpcHealthySyncQueuedSchema,
  RpcUnhealthySyncQueuedSchema,
  RpcHealthyIndexingQueuedSchema,
  RpcUnhealthyIndexingQueuedSchema,
  RpcHealthyIndexingStartedSchema,
  RpcUnhealthyIndexingStartedSchema,
]);

const IndexingStatusDtoSchema = z
  .record(z.string().transform(Number).pipe(ChainIdSchema), ChainStatusSchema, {
    error: "Chains configuration must be an object mapping valid chain IDs to their configs.",
  })
  .transform((parsedIndexStatusDto) => {
    const indexingStatusDomain: IndexingStatusDomain.IndexingStatus = new Map();

    for (const chainStatus of Object.values(parsedIndexStatusDto)) {
      indexingStatusDomain.set(chainStatus.chainId, chainStatus);
    }

    return indexingStatusDomain;
  });

/**
 * Deserialize IndexingStatus DTO object.
 *
 * @returns {IndexingStatusDomain.IndexingStatus}
 * @throws {Error} when the DTO object could not be deserialized
 */
export function deserializeIndexingStatus(
  indexingStatusDto: IndexingStatusDTO.IndexingStatus,
): IndexingStatusDomain.IndexingStatus {
  const parsed = IndexingStatusDtoSchema.safeParse(indexingStatusDto);

  if (parsed.error) {
    throw new Error(`Failed to parse IndexingStatus DTO: \n${z.prettifyError(parsed.error)}\n`);
  }

  return parsed.data;
}
