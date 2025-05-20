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
 * The ThreeDNS plugin describes indexing behavior for the ThreeDNSOptimism & ThreeDNSBase Datasources.
 */
export const pluginName = PluginName.ThreeDNS;
export const requiredDatasources = [
  DatasourceName.ThreeDNSOptimism,
  DatasourceName.ThreeDNSBase,
];

const namespace = makePluginNamespace(pluginName);

export const getDataSources = (config: ENSIndexerConfig) => {
  return {
    [DatasourceName.ThreeDNSOptimism]:
      config.selectedEnsDeployment[DatasourceName.ThreeDNSOptimism],
    [DatasourceName.ThreeDNSBase]:
      config.selectedEnsDeployment[DatasourceName.ThreeDNSBase],
  };
};

export const config = (config: ENSIndexerConfig) => {
  const {
    [DatasourceName.ThreeDNSOptimism]: {
      chain: optimism,
      contracts: optimismContracts,
    },
    [DatasourceName.ThreeDNSBase]: { chain: base, contracts: baseContracts },
  } = getDataSources(config);

  return createConfig({
    networks: {
      ...networksConfigForChain(config, optimism.id),
      ...networksConfigForChain(config, base.id),
    },
    contracts: {
      [namespace("ThreeDNSToken")]: {
        network: {
          ...networkConfigForContract(
            optimism,
            optimismContracts.ThreeDNSToken
          ),
          ...networkConfigForContract(base, baseContracts.ThreeDNSToken),
        },
        abi: optimismContracts.ThreeDNSToken.abi,
      },
      [namespace("Resolver")]: {
        network: {
          ...networkConfigForContract(optimism, optimismContracts.Resolver),
          ...networkConfigForContract(base, baseContracts.Resolver),
        },
        abi: optimismContracts.Resolver.abi,
      },
    },
  });
};

export const activate = activateHandlers({
  pluginName,
  namespace,
  handlers: [import("./handlers/ThreeDNSToken")],
});
