import { definePlugin } from "@/lib/plugin-helpers";
import { DatasourceName } from "@ensnode/ens-deployments";
import { PluginName } from "@ensnode/ensnode-sdk";
import { createConfig as createPonderConfig } from "ponder";

/**
 * The Basenames plugin describes indexing behavior for the Basenames ENS Datasource, leveraging
 * the shared Subgraph-compatible indexing logic.
 */
export default definePlugin({
  // plugin name
  name: PluginName.Basenames,

  // list of datasources required in `pluginConfig
  requiredDatasources: [DatasourceName.Basenames],

  // list of dynamic imports for indexing handlers required by the plugin
  indexingHandlers() {
    return [
      // import("./handlers/Registry"),
      // import("./handlers/Registrar"),
      // import("../shared/Resolver"),
    ];
  },

  // plugin config factory defining Ponder configuration for the plugin
  pluginConfig({ datasourceConfigOptions, namespace }) {
    const { contracts, networkConfigForContract, networksConfigForChain } = datasourceConfigOptions(
      DatasourceName.Basenames,
    );

    return createPonderConfig({
      networks: networksConfigForChain(),
      contracts: {
        [namespace("Registry")]: {
          network: networkConfigForContract(contracts.Registry),
          abi: contracts.Registry.abi,
        },
        [namespace("BaseRegistrar")]: {
          network: networkConfigForContract(contracts.BaseRegistrar),
          abi: contracts.BaseRegistrar.abi,
        },
        [namespace("EARegistrarController")]: {
          network: networkConfigForContract(contracts.EARegistrarController),
          abi: contracts.EARegistrarController.abi,
        },
        [namespace("RegistrarController")]: {
          network: networkConfigForContract(contracts.RegistrarController),
          abi: contracts.RegistrarController.abi,
        },
        Resolver: {
          network: networkConfigForContract(contracts.Resolver),
          abi: contracts.Resolver.abi,
        },
      },
    });
  },
});
