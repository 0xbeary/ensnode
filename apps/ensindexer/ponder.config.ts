import config from "@/config/app-config";
import { validateConfig } from "@/config/validations";
import { mergePonderConfigs } from "@/lib/merge-ponder-configs";
import { MergedTypes, getActivePlugins } from "@/lib/plugin-helpers";
import { AVAILABLE_PLUGINS } from "@/plugins";

////////
// Next, filter ALL_PLUGINS by those that the user has selected (via ACTIVE_PLUGINS), panicking if a
// user-specified plugin is unsupported by the Datasources available in SELECTED_ENS_DEPLOYMENT.
////////

const activePlugins = getActivePlugins(AVAILABLE_PLUGINS, config);

////////
// Merge the plugins' configs into a single ponder config, including injected dependencies.
////////

export type MergedPonderConfig = MergedTypes<
  ReturnType<(typeof AVAILABLE_PLUGINS)[number]["config"]>
> & {
  /**
   * The environment variables that change the behavior of the indexer.
   * It's important to include all environment variables that change the behavior
   * of the indexer to ensure Ponder app build ID is updated when any of them change.
   **/
  indexingBehaviorDependencies: {
    HEAL_REVERSE_ADDRESSES: boolean;
  };
};

// merge the individual ponder configs from each plugin into the config we return to Ponder
const ponderConfig = activePlugins
  .map((plugin) => plugin.config())
  .reduce((acc, val) => mergePonderConfigs(acc, val), {}) as MergedPonderConfig;

// set the indexing behavior dependencies
ponderConfig.indexingBehaviorDependencies = {
  HEAL_REVERSE_ADDRESSES: config.healReverseAddresses,
};

// Validate the config before we activate the plugins. These validations go beyond simple type
// validations and ensure any relationships between environment variables are correct.
validateConfig(config, ponderConfig.networks);

////////
// Activate the active plugins' handlers, which register indexing handlers with Ponder.
////////

// NOTE: we explicitly delay the execution of this function for 1 tick, to avoid a race condition
// within ponder internals related to the schema name and drizzle-orm
setTimeout(() => activePlugins.map((plugin) => plugin.activate()), 0);

////////
// Finally, return the merged config for ponder to use for type inference and runtime behavior.
////////

export default ponderConfig;
