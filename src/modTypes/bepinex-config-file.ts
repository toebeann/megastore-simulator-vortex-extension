/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { basename, extname, resolve } from "node:path";

import { type types as t, util } from "vortex-api";

import { NEXUS_GAME_ID } from "../constants";
import {
  BEPINEX_CONFIG_DIR_PATH,
  BEPINEX_CORE_FILES,
  BEPINEX_DIR,
} from "../util/bepinex";
import { getDiscovery } from "../util/vortex";

import isChildPath = util.isChildPath;

export const BEPINEX_CONFIG_FILE_MOD_TYPE = "bepinex-config-file";

export const isSupported = (gameId: string) => gameId === NEXUS_GAME_ID;

export const getPath = (state: t.IState, game: t.IGame): string =>
  resolve(getDiscovery(state, game.id)?.path ?? "", BEPINEX_CONFIG_DIR_PATH);

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
    .some((destination) => extname(destination) === ".cfg") &&
    copyDestinationsLowerCase
      .every((destination) =>
        !isChildPath(destination, bepinexDir) &&
        !disallowed.includes(basename(destination))
      );
};

export const register = (context: t.IExtensionContext) =>
  context.registerModType(
    BEPINEX_CONFIG_FILE_MOD_TYPE,
    90,
    isSupported,
    (game: t.IGame) => getPath(context.api.getState(), game),
    test,
    { name: "BepInEx Config File", mergeMods: true },
  );
export default register;
