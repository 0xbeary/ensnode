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
 * The Lineanames plugin describes indexing behavior for the Lineanames ENS Datasource, leveraging
 * the shared Subgraph-compatible indexing logic.
 */
export const pluginName = PluginName.Lineanames;
export const requiredDatasources = [DatasourceName.Lineanames];

const namespace = makePluginNamespace(pluginName);

export const getDataSources = (config: ENSIndexerConfig) => {
  return {
    [DatasourceName.Lineanames]:
      config.selectedEnsDeployment[DatasourceName.Lineanames],
  };
};

export const config = (config: ENSIndexerConfig) => {
  const { chain, contracts } =
    getDataSources(config)[DatasourceName.Lineanames];

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
      [namespace("EthRegistrarController")]: {
        network: networkConfigForContract(
          chain,
          contracts.EthRegistrarController
        ),
        abi: contracts.EthRegistrarController.abi,
      },
      [namespace("NameWrapper")]: {
        network: networkConfigForContract(chain, contracts.NameWrapper),
        abi: contracts.NameWrapper.abi,
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
    import("./handlers/NameWrapper"),
    import("../shared/Resolver"),
  ],
});
