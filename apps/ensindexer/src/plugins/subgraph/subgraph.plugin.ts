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
 * The Subgraph plugin describes indexing behavior for the 'Root' Datasource, in alignment with the
 * legacy ENS Subgraph indexing logic.
 */
export const pluginName = PluginName.Subgraph;
export const requiredDatasources = [DatasourceName.Root];

const namespace = makePluginNamespace(pluginName);

export const getDataSources = (config: ENSIndexerConfig) => {
  return {
    [DatasourceName.Root]: config.selectedEnsDeployment[DatasourceName.Root],
  };
};

export const config = (config: ENSIndexerConfig) => {
  const { chain, contracts } = getDataSources(config)[DatasourceName.Root];

  return createConfig({
    networks: networksConfigForChain(config, chain.id),
    contracts: {
      [namespace("RegistryOld")]: {
        network: networkConfigForContract(chain, contracts.RegistryOld),
        abi: contracts.Registry.abi,
      },
      [namespace("Registry")]: {
        network: networkConfigForContract(chain, contracts.Registry),
        abi: contracts.Registry.abi,
      },
      [namespace("BaseRegistrar")]: {
        network: networkConfigForContract(chain, contracts.BaseRegistrar),
        abi: contracts.BaseRegistrar.abi,
      },
      [namespace("EthRegistrarControllerOld")]: {
        network: networkConfigForContract(
          chain,
          contracts.EthRegistrarControllerOld
        ),
        abi: contracts.EthRegistrarControllerOld.abi,
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
