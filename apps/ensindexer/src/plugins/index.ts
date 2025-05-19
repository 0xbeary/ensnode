import * as basenamesPlugin from "@/plugins/basenames/basenames.plugin";
import * as lineaNamesPlugin from "@/plugins/lineanames/lineanames.plugin";
import * as subgraphPlugin from "@/plugins/subgraph/subgraph.plugin";
import * as threednsPlugin from "@/plugins/threedns/threedns.plugin";

////////
// First, generate MergedPonderConfig type representing the merged types of each plugin's `config`,
// so ponder's typechecking of the indexing handlers and their event arguments is correct.
////////
export const AVAILABLE_PLUGINS = [
  subgraphPlugin,
  basenamesPlugin,
  lineaNamesPlugin,
  threednsPlugin,
] as const;
