import { definePlugin } from "@/lib/plugin-helpers";
import { DatasourceName } from "@ensnode/ens-deployments";
import { PluginName } from "@ensnode/ensnode-sdk";
import { createConfig as createPonderConfig } from "ponder";

/**
 * The Subgraph plugin describes indexing behavior for the 'Root' Datasource, in alignment with the
 * legacy ENS Subgraph indexing logic.
 */
export default definePlugin({
  // plugin name
  name: PluginName.Subgraph,

  // list of datasources required in `pluginConfig
  requiredDatasources: [DatasourceName.Root],

  // list of dynamic imports for indexing handlers required by the plugin
  indexingHandlers() {
    return [
      // import("./handlers/Registry"),
      // import("./handlers/Registrar"),
      // import("./handlers/NameWrapper"),
      // import("../shared/Resolver"),
    ];
  },

  // plugin config factory defining Ponder configuration for the plugin
  pluginConfig({ datasourceConfigOptions, namespace }) {
    const { contracts, networkConfigForContract, networksConfigForChain } = datasourceConfigOptions(
      DatasourceName.Root,
    );

    return createPonderConfig({
      networks: networksConfigForChain(),
      contracts: {
        [namespace("RegistryOld")]: {
          network: networkConfigForContract(contracts.RegistryOld),
          abi: contracts.Registry.abi,
        },
        [namespace("Registry")]: {
          network: networkConfigForContract(contracts.Registry),
          abi: contracts.Registry.abi,
        },
        [namespace("BaseRegistrar")]: {
          network: networkConfigForContract(contracts.BaseRegistrar),
          abi: contracts.BaseRegistrar.abi,
        },
        [namespace("EthRegistrarControllerOld")]: {
          network: networkConfigForContract(contracts.EthRegistrarControllerOld),
          abi: contracts.EthRegistrarControllerOld.abi,
        },
        [namespace("EthRegistrarController")]: {
          network: networkConfigForContract(contracts.EthRegistrarController),
          abi: contracts.EthRegistrarController.abi,
        },
        [namespace("NameWrapper")]: {
          network: networkConfigForContract(contracts.NameWrapper),
          abi: contracts.NameWrapper.abi,
        },
        Resolver: {
          network: networkConfigForContract(contracts.Resolver),
          abi: contracts.Resolver.abi,
        },
      },
    });
  },
});
