import { createConfig } from "ponder";

import { ENSIndexerConfig } from "@/config/types";
import {
  activateHandlers,
  makePluginNamespace,
  networkConfigForContract,
  networksConfigForChain,
} from "@/lib/plugin-helpers";
import { DatasourceName } from "@ensnode/ens-deployments";
import { PluginName } from "@ensnode/utils";

/**
 * The Basenames plugin describes indexing behavior for the Basenames ENS Datasource, leveraging
 * the shared Subgraph-compatible indexing logic.
 */
export const pluginName = PluginName.Basenames;
export const requiredDatasources = [DatasourceName.Basenames];

export const getDataSources = (config: ENSIndexerConfig) => {
  return {
    [DatasourceName.Basenames]:
      config.selectedEnsDeployment[DatasourceName.Basenames],
  };
};

const namespace = makePluginNamespace(pluginName);

export const config = (config: ENSIndexerConfig) => {
  const { chain, contracts } = getDataSources(config)[DatasourceName.Basenames];

  return createConfig({
    networks: networksConfigForChain(config, chain.id),
    contracts: {
      [namespace("Registry")]: {
        network: networkConfigForContract(chain, contracts.Registry),
        abi: contracts.Registry.abi,
      },
      [namespace("BaseRegistrar")]: {
        network: networkConfigForContract(chain, contracts.BaseRegistrar),
        abi: contracts.BaseRegistrar.abi,
      },
      [namespace("EARegistrarController")]: {
        network: networkConfigForContract(
          chain,
          contracts.EARegistrarController
        ),
        abi: contracts.EARegistrarController.abi,
      },
      [namespace("RegistrarController")]: {
        network: networkConfigForContract(chain, contracts.RegistrarController),
        abi: contracts.RegistrarController.abi,
      },
      Resolver: {
        network: networkConfigForContract(chain, contracts.Resolver),
        abi: contracts.Resolver.abi,
      },
    },
  });
};

export const activate = activateHandlers({
  pluginName,
  namespace,
  handlers: [
    import("./handlers/Registry"),
    import("./handlers/Registrar"),
    import("../shared/Resolver"),
  ],
});
