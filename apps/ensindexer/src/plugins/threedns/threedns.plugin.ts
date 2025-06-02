import { createConfig as createPonderConfig } from "ponder";

import { definePlugin } from "@/lib/plugin-helpers";
import { DatasourceName } from "@ensnode/ens-deployments";
import { PluginName } from "@ensnode/ensnode-sdk";

/**
 * The ThreeDNS plugin describes indexing behavior for 3DNSToken on both Optimism and Base.
 */
export default definePlugin({
  // plugin name
  name: PluginName.ThreeDNS,

  // list of datasources required in `pluginConfig
  requiredDatasources: [DatasourceName.ThreeDNSBase, DatasourceName.ThreeDNSOptimism],

  // list of dynamic imports for indexing handlers required by the plugin
  indexingHandlers() {
    return [import("./handlers/ThreeDNSToken")];
  },

  // plugin config factory defining Ponder configuration for the plugin
  pluginConfig({ datasourceConfigOptions, namespace }) {
    const threeDNSBase = datasourceConfigOptions(DatasourceName.ThreeDNSBase);
    const threeDNSOptimism = datasourceConfigOptions(DatasourceName.ThreeDNSOptimism);

    return createPonderConfig({
      networks: {
        ...threeDNSOptimism.networksConfigForChain,
        ...threeDNSBase.networksConfigForChain,
      },
      contracts: {
        [namespace("ThreeDNSToken")]: {
          network: {
            ...threeDNSOptimism.networkConfigForContract(threeDNSOptimism.contracts.ThreeDNSToken),
            ...threeDNSBase.networkConfigForContract(threeDNSBase.contracts.ThreeDNSToken),
          },
          abi: threeDNSOptimism.contracts.ThreeDNSToken.abi,
        },
        [namespace("Resolver")]: {
          network: {
            ...threeDNSOptimism.networkConfigForContract(threeDNSOptimism.contracts.Resolver),
            ...threeDNSBase.networkConfigForContract(threeDNSBase.contracts.Resolver),
          },
          abi: threeDNSOptimism.contracts.Resolver.abi,
        },
      },
    });
  },
});
