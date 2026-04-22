import { basename, join, resolve } from "node:path";

import { type types as t, util } from "vortex-api";

import { context } from "@";
import { NEXUS_GAME_ID } from "@/constants";
import { getDiscovery } from "@/util/vortex";
import {
  BEPINEX_CORE_FILES,
  BEPINEX_DIR,
  BEPINEX_MOD_PATH,
} from "@/util/bepinex";

import isChildPath = util.isChildPath;

export const ADDITIONAL_PRODUCTS_PACK_MOD_TYPE = "additional-products-pack";
export const ADDITIONAL_PRODUCTS_PACK_DIR = join(
  BEPINEX_MOD_PATH,
  "AdditionalProducts",
  "Products",
);

export const isSupported = (gameId: string): boolean =>
  gameId === NEXUS_GAME_ID;

export const getPath = (game: t.IGame): string =>
  resolve(
    getDiscovery(undefined, game.id)?.path ?? "",
    ADDITIONAL_PRODUCTS_PACK_DIR,
  );

export const test = async (
  instructions: t.IInstruction[],
): Promise<boolean> => {
  const copyDestinationsLowerCase = instructions
    .filter((instruction) =>
      instruction.type === "copy" && instruction.destination
    )
    .map((instruction) => instruction.destination!.toLowerCase());

  const disallowed = ["winhttp.dll", ...BEPINEX_CORE_FILES]
    .map((name) => name.toLowerCase());

  const bepinexDir = BEPINEX_DIR.toLowerCase();

  return copyDestinationsLowerCase
    .some((destination) => basename(destination) === "manifest.xml") &&
    copyDestinationsLowerCase
      .every((destination) =>
        !isChildPath(destination, bepinexDir) &&
        !disallowed.includes(basename(destination))
      );
};

export const register = () =>
  context?.registerModType(
    ADDITIONAL_PRODUCTS_PACK_MOD_TYPE,
    85,
    isSupported,
    getPath,
    test,
    { name: "Additional Products Pack", mergeMods: true },
  );
