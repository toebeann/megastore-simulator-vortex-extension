/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { join, sep } from "node:path";

import type { types as t } from "vortex-api";

import { context } from "@";
import { NEXUS_GAME_ID } from "@/constants";
import {
  BEPINEX_CORE_DIR,
  BEPINEX_CORE_FILES,
  BEPINEX_DIR,
} from "@/util/bepinex";
import { getDiscovery } from "@/util/vortex";

export const BEPINEX_5_MOD_TYPE = "bepinex-5";

export const isSupported = (gameId: string): boolean =>
  gameId === NEXUS_GAME_ID;

export const getPath = (game: t.IGame): string =>
  getDiscovery(undefined, game.id)?.path ?? "";

export const test = async (
  instructions: t.IInstruction[],
): Promise<boolean> => {
  const copyDestinationsLowerCase = instructions
    .filter((instruction) =>
      instruction.type === "copy" && instruction.destination
    )
    .map((instruction) => instruction.destination!.toLowerCase());
  return copyDestinationsLowerCase.some((destination) =>
    destination.split(sep)[0] === BEPINEX_DIR.toLowerCase()
  ) &&
    BEPINEX_CORE_FILES.every((file) =>
      copyDestinationsLowerCase.includes(
        join(BEPINEX_DIR, BEPINEX_CORE_DIR, file).toLowerCase(),
      )
    );
};

export const register = () =>
  context?.registerModType(
    BEPINEX_5_MOD_TYPE,
    50,
    isSupported,
    getPath,
    test,
    { name: "BepInEx 5", mergeMods: true, deploymentEssential: true },
  );
