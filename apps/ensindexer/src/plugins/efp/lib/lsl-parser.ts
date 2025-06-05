/**
 * EFP List Storage Location parser
 */

import type { ENSDeploymentChain } from "@ensnode/ens-deployments";
import { base, baseSepolia, mainnet, optimism, optimismSepolia, sepolia } from "viem/chains";
import { getAddress } from "viem/utils";
import { prettifyError, z } from "zod/v4";
import { ListStorageLocation } from "./types";

// NOTE: based on code from https://github.com/ethereumfollowprotocol/onchain/blob/f3c970e/src/efp.ts#L95-L123
/**
 * Parses an encoded List Storage Location string and returns a decoded ListStorageLocation object.
 *
 * Each List Storage Location is encoded as a bytes array with the following structure:
 * - `version`: A uint8 representing the version of the List Storage Location. This is used to ensure compatibility and facilitate future upgrades.
 * - `location_type`: A uint8 indicating the type of list storage location. This identifies the kind of data the data field contains..
 * - `data:` A bytes array containing the actual data of the list storage location. The structure of this data depends on the location type.
 *
 * @param encodedLsl - The encoded List Storage Location string to parse.
 * @param efpChainIds - The list of chain IDs where EFP is present
 * @throws An error if parsing could not be completed successfully.
 * @returns A decoded {@link ListStorageLocation} object.
 */
export function parseEncodedListStorageLocation(
  encodedLsl: string,
  efpChainIds: number[],
): ListStorageLocation {
  const parserContext = {
    inputLength: encodedLsl.length,
  } satisfies LslParserContext;

  const slicedEncodedLsl = sliceEncodedLsl(encodedLsl);

  const efpLslSchema = createEfpLslSchema({
    efpChainIds,
  });

  const parsed = efpLslSchema.safeParse({
    ...slicedEncodedLsl,
    ...parserContext,
  });

  if (!parsed.success) {
    throw new Error(
      "Failed to parse environment configuration: \n" + prettifyError(parsed.error) + "\n",
    );
  }
  return parsed.data;
}

/**
 * Get a list of EFP Chain IDs for the ENS Deployment Chain.
 *
 * @param ensDeploymentChain
 * @returns list of EFP chain IDs
 */
export function getEFPChainIds(ensDeploymentChain: ENSDeploymentChain): number[] {
  switch (ensDeploymentChain) {
    case "mainnet":
      return [base.id, optimism.id, mainnet.id];
    case "sepolia":
      return [baseSepolia.id, optimismSepolia.id, sepolia.id];
    default:
      throw new Error(
        `LSL Chain IDs are not configured for ${ensDeploymentChain} ENS Deployment Chain`,
      );
  }
}

/**
 * Data structure used as a subject of parsing with {@link createEfpLslSchema}.
 */
interface EncodedListStorageLocation {
  /**
   * The version of the List Storage Location.
   *
   * Formatted as the string representation of a `uint8` value.
   * This is used to ensure compatibility and facilitate future upgrades.
   * The version is always 1.
   */
  version: string;

  /**
   * The type of the List Storage Location.
   *
   * Formatted as the string representation of a `uint8` value.
   * This identifies the kind of data the data field contains.
   * The location type is always 1.
   */
  type: string;

  /**
   * 32-byte EVM chain ID of the chain where the EFP list records are stored.
   */
  chainId: string;

  /**
   * The 20-byte EVM address of the contract where the list is stored.
   */
  listRecordsAddress: string;

  /**
   * The 32-byte value that specifies the storage slot of the list within the contract.
   * This disambiguates multiple lists stored within the same contract and
   * de-couples it from the EFP List NFT token id which is stored on Ethereum and
   * inaccessible on L2s.
   */
  slot: string;
}

/**
 * Slice encoded LSL into a dictionary of LSL params.
 * @param encodedLsl
 * @returns {EncodedListStorageLocation} LSL params.
 */
function sliceEncodedLsl(encodedLsl: string): EncodedListStorageLocation {
  return {
    // Extract the first byte after the 0x (2 hex characters = 1 byte)
    version: encodedLsl.slice(2, 4),

    // Extract the second byte
    type: encodedLsl.slice(4, 6),

    // Extract the next 32 bytes to get the chain id
    chainId: encodedLsl.slice(6, 70),

    // Extract the address (40 hex characters = 20 bytes)
    listRecordsAddress: encodedLsl.slice(70, 110),

    // Extract last 32 bytes to get the slot
    slot: encodedLsl.slice(110, 174),
  } satisfies EncodedListStorageLocation;
}

/**
 * Context object to be used by the {@link parseEncodedListStorageLocation} parser.
 */
interface LslParserContext {
  /**
   * The length of an encodedLsl string. Used for validation purposes only.
   */
  inputLength: number;
}

/**
 * Options required for data parsing with {@link createEfpLslSchema}.
 */
interface CreateEfpLslSchemaOptions {
  /**
   * List of IDs for chains that the EFP protocol has been present on.
   */
  efpChainIds: number[];
}

/**
 * Create a zod schema covering validations and invariants enforced with {@link parseEncodedListStorageLocation} parser.
 */
const createEfpLslSchema = (options: CreateEfpLslSchemaOptions) =>
  z
    .object({
      inputLength: z.literal(174),

      version: z.literal("01").transform(() => 1 as const),

      type: z.literal("01").transform(() => 1 as const),

      chainId: z
        .string()
        .length(64)
        .transform((v) => BigInt("0x" + v))
        .refine((v) => v > BigInt(Number.MIN_SAFE_INTEGER) || v < BigInt(Number.MAX_SAFE_INTEGER), {
          message:
            "chainId must be a value between Number.MIN_SAFE_INTEGER and Number.MAX_SAFE_INTEGER",
        })
        .transform((v) => Number(v)),

      listRecordsAddress: z
        .string()
        .length(40)
        .transform((v) => `0x${v}`)
        .transform((v) => getAddress(v)),

      slot: z
        .string()
        .length(64)
        .transform((v) => BigInt("0x" + v)),
    })
    // invariant: chainId is from one of the chains that EFP has been present on
    // https://docs.efp.app/production/deployments/
    .refine((v) => options.efpChainIds.includes(v.chainId), {
      message: `chainId must be one of the EFP Chain IDs: ${options.efpChainIds.join(", ")}`,
    })
    //
    // leave parser context props out of the output object
    .transform(({ inputLength, ...decodedLsl }) => decodedLsl);
