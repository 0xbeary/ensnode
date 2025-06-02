import { beforeEach, describe, expect, it } from "vitest";
import { setupConfigMock } from "./utils/mockConfig";
setupConfigMock(); // setup config mock before importing dependent modules

import type { ENSIndexerConfig } from "@/config/types";
import { constrainContractBlockrange, makePluginNamespace } from "@/lib/plugin-helpers";
import { PluginName } from "@ensnode/ensnode-sdk";

describe("createPluginNamespace", () => {
  it("should return a function that creates namespaced contract names", () => {
    const boxNs = makePluginNamespace("box" as PluginName);
    const subgraphNs = makePluginNamespace(PluginName.Subgraph);
    const basenamesNes = makePluginNamespace(PluginName.Basenames);

    expect(boxNs("Registry")).toBe("box/Registry");
    expect(subgraphNs("Registry")).toBe("subgraph/Registry");
    expect(basenamesNes("Registry")).toBe("basenames/Registry");
  });

  it("should throw if invalid characters", () => {
    expect(() => makePluginNamespace("subgraph.test" as PluginName)).toThrowError(/reserved/i);
    expect(() => makePluginNamespace("subgraph:test" as PluginName)).toThrowError(/reserved/i);
  });
});

describe("constrainContractBlockrange", () => {
  let ensIndexerConfig: Pick<ENSIndexerConfig, "globalBlockrange">;

  function setGlobalBlockrange(
    startBlock?: ENSIndexerConfig["globalBlockrange"]["startBlock"],
    endBlock?: ENSIndexerConfig["globalBlockrange"]["endBlock"],
  ) {
    ensIndexerConfig = {
      globalBlockrange: {
        startBlock,
        endBlock,
      },
    } satisfies typeof ensIndexerConfig;
  }
  describe("without global range", () => {
    beforeEach(() => {
      setGlobalBlockrange(undefined, undefined);
    });

    it("should return valid startBlock and endBlock", () => {
      const range = constrainContractBlockrange(ensIndexerConfig, 5);
      expect(range).toEqual({ startBlock: 5, endBlock: undefined });
    });

    it("should handle undefined contractStartBlock", () => {
      const range = constrainContractBlockrange(ensIndexerConfig, undefined);
      expect(range).toEqual({ startBlock: 0, endBlock: undefined });
    });
  });

  describe("with global range", () => {
    beforeEach(() => {
      setGlobalBlockrange(undefined, 1234);
    });

    it("should respect global end block", () => {
      const config = constrainContractBlockrange(ensIndexerConfig, 5);
      expect(config).toEqual({ startBlock: 5, endBlock: 1234 });
    });

    it("should handle undefined contract start block", () => {
      const config = constrainContractBlockrange(ensIndexerConfig, undefined);
      expect(config).toEqual({ startBlock: 0, endBlock: 1234 });
    });

    it("should use contract start block if later than global start", () => {
      setGlobalBlockrange(10, 1234);

      const config = constrainContractBlockrange(ensIndexerConfig, 20);
      expect(config).toEqual({ startBlock: 20, endBlock: 1234 });
    });

    it("should use global start block if later than contract start", () => {
      setGlobalBlockrange(30, 1234);

      const config = constrainContractBlockrange(ensIndexerConfig, 20);
      expect(config).toEqual({ startBlock: 30, endBlock: 1234 });
    });
  });
});
