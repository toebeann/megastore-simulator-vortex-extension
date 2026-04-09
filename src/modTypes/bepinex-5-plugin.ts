/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { basename, extname, resolve } from "node:path";

import { type types as t, util } from "vortex-api";

import { NEXUS_GAME_ID } from "../constants";
import {
  BEPINEX_CORE_FILES,
  BEPINEX_DIR,
  BEPINEX_MOD_PATH,
} from "../util/bepinex";
import { getDiscovery } from "../util/vortex";
import { context } from "..";

import isChildPath = util.isChildPath;

export const BEPINEX_5_PLUGIN_MOD_TYPE = "bepinex-5-plugin";

export const isSupported = (gameId: string): boolean =>
  gameId === NEXUS_GAME_ID;

export const getPath = (game: t.IGame): string =>
  resolve(getDiscovery(undefined, game.id)?.path ?? "", BEPINEX_MOD_PATH);

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
    .some((destination) => extname(destination) === ".dll") &&
    copyDestinationsLowerCase
      .every((destination) =>
        !isChildPath(destination, bepinexDir) &&
        !disallowed.includes(basename(destination))
      );
};

export const register = () =>
  context?.registerModType(
    BEPINEX_5_PLUGIN_MOD_TYPE,
    80,
    isSupported,
    getPath,
    test,
    { name: "BepInEx 5 Plugin", mergeMods: true },
  );
