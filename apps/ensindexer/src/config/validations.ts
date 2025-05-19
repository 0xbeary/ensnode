import { ENSIndexerConfig } from "@/config/types";
import { ENSIndexerPlugin } from "@/lib/plugin-helpers";
import { DatasourceName } from "@ensnode/ens-deployments";
import { PluginName } from "@ensnode/utils";
import { Address, isAddress } from "viem";
import { MergedPonderConfig } from "../../ponder.config";

// Helper function to check rpc url exists for a given chain
const doesRpcUrlExistForChain = (
  config: ENSIndexerConfig,
  chainId: number
): boolean => {
  return config.indexedChains[chainId]?.rpcEndpointUrl !== undefined;
};

/**
 * Validates the global block range configuration against the plugin setup. Block ranges
 * are not to be used in production and are only to be used for testing purposes.
 *
 * This is typically used for:
 * - Snapshotting ENSNode at a specific block
 * - Comparing with Subgraph snapshots
 * - Single-network testing scenarios
 *
 * They only work when a single network is being indexed and this function ensures that
 * the global block range is not being used when multiple networks are being indexed.
 *
 * Invariant:
 * - Single network is active to use either startBlock or endBlock
 *
 * @throws {Error} When attempting to use global block ranges with multiple networks
 */
export const validateGlobalBlockrange = (
  config: ENSIndexerConfig,
  networks: MergedPonderConfig["networks"]
): void => {
  const { globalBlockrange, ensDeploymentChain, plugins } = config;

  if (
    globalBlockrange.startBlock !== undefined ||
    globalBlockrange.endBlock !== undefined
  ) {
    const numNetworks = Object.keys(networks).length;
    if (numNetworks > 1) {
      throw new Error(
        `ENSIndexer's behavior when indexing _multiple networks_ with a _specific blockrange_ is considered undefined (for now). If you're using this feature, you're likely interested in snapshotting at a specific END_BLOCK, and may have unintentially activated plugins that source events from multiple chains.
  
  The config currently is:
  ENS_DEPLOYMENT_CHAIN=${ensDeploymentChain}
  ACTIVE_PLUGINS=${Array.from(plugins).join(",")}
  START_BLOCK=${globalBlockrange.startBlock || "n/a"}
  END_BLOCK=${globalBlockrange.endBlock || "n/a"}
  
  The usage you're most likely interested in is:
    ENS_DEPLOYMENT_CHAIN=(mainnet|sepolia|holesky) ACTIVE_PLUGINS=subgraph END_BLOCK=x pnpm run start
  which runs just the 'subgraph' plugin with a specific end block, suitable for snapshotting ENSNode and comparing to Subgraph snapshots.
  
  In the future, indexing multiple networks with network-specific blockrange constraints may be possible.`
      );
    }
  }
};

/**
 * Validates the chain configurations in the config and ponder config to ensure that the
 * indexer has the necessary configuration to index the chains it is configured to index.
 *
 * For each plugin, the indexer will attempt to source events from the chains it is configured to index.
 * This function ensures that the RPC_URL_* environment variables are defined for each chain the indexer
 * is configured to index.
 */
export const validateChainConfigs = (
  config: ENSIndexerConfig,
  networks: MergedPonderConfig["networks"]
): void => {
  const { plugins } = config;

  const allChainIds = Object.values(networks).map((network) => network.chainId);

  if (
    !allChainIds.every((chainId) => doesRpcUrlExistForChain(config, chainId))
  ) {
    throw new Error(
      `ENSNode has been configured with the following ACTIVE_PLUGINS: ${Array.from(
        plugins
      ).join(", ")}.
    These plugins, collectively, index events from the following chains: ${allChainIds.join(
      ", "
    )}.
    
    The following RPC_URL_* environment variables must be defined for nominal indexing behavior:
    ${allChainIds
      .map(
        (chainId) =>
          `RPC_URL_${chainId}: ${
            config.indexedChains[chainId]?.rpcEndpointUrl || "N/A"
          }`
      )
      .join("\n    ")}
    `
    );
  }
};

export function validateActivePlugins<PLUGIN extends ENSIndexerPlugin>(
  availablePlugins: readonly PLUGIN[],
  config: ENSIndexerConfig
) {
  console.log("config is", config);

  // the available Datasources are those that the selected ENSDeployment defines
  const availableDatasourceNames = Object.keys(
    config.selectedEnsDeployment
  ) as DatasourceName[];

  // filter allPlugins by those that the user requested
  const activePlugins = availablePlugins.filter((plugin) =>
    config.plugins.has(plugin.pluginName)
  );

  // validate that each active plugin's requiredDatasources are available in availableDatasourceNames
  for (const plugin of activePlugins) {
    const hasRequiredDatasources = plugin.requiredDatasources.every(
      (datasourceName) => availableDatasourceNames.includes(datasourceName)
    );

    if (!hasRequiredDatasources) {
      throw new Error(
        `Requested plugin '${plugin.pluginName}' cannot be activated for the ${
          config.ensDeploymentChain
        } deployment. ${
          plugin.pluginName
        } specifies dependent datasources: ${plugin.requiredDatasources.join(
          ", "
        )}, but available datasources in the ${
          config.ensDeploymentChain
        } deployment are: ${availableDatasourceNames.join(", ")}.`
      );
    }
  }
}

export function validateConfig(
  config: ENSIndexerConfig,
  networks: MergedPonderConfig["networks"]
) {
  ////////
  // Invariant: All configured networks must have a custom RPC endpoint provided. Public RPC endpoints
  // will ratelimit and make indexing more or less unusable.
  ////////
  validateChainConfigs(config, networks);

  ////////
  // Invariant: if using a custom START_BLOCK or END_BLOCK, ponder should be configured to index at
  // most one network.
  ////////
  validateGlobalBlockrange(config, networks);
}

/**
 * Validates runtime contract configuration.
 *
 * @param contracts - An array of contract configurations to validate
 * @throws {Error} If any contract with an address field has an invalid address format
 */
export function validateContractConfigs(
  pluginName: PluginName,
  config: ENSIndexerConfig
) {
  const contracts = config.selectedEnsDeployment[DatasourceName.Root].contracts;

  // invariant: `contracts` must provide valid addresses if a filter is not provided
  //  (see packages/ens-deployments/src/ens-test-env.ts) for context
  const hasAddresses = Object.values(contracts)
    .filter((contractConfig) => "address" in contractConfig) // only ContractConfigs with `address` defined
    .every((contractConfig) => isAddress(contractConfig.address as Address)); // must be a valid `Address`

  if (!hasAddresses) {
    throw new Error(
      `The ENSDeployment '${
        config.ensDeploymentChain
      }' provided to the '${pluginName}' plugin does not define valid addresses. This occurs if the 'address' of any ContractConfig in the ENSDeployment is malformed (i.e. not an Address). This is only likely to occur if you are running the 'ens-test-env' ENSDeployment outside of the context of the ens-test-env tool (https://github.com/ensdomains/ens-test-env). If you are activating the ens-test-env plugin and receive this error, NEXT_PUBLIC_DEPLOYMENT_ADDRESSES or DEPLOYMENT_ADDRESSES is not available in the env or is malformed.

Here are the contract configs we attempted to validate:
${JSON.stringify(contracts)}`
    );
  }
}
