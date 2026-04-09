/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { types as t } from "vortex-api";

import { NEXUS_GAME_ID } from "../constants";
import { validSaveFiles } from "../installers/save-file";
import { getSaveFolder } from "../util/getSaveFolder";
import { context } from "..";

export const SAVE_FILE_MOD_TYPE = "save-file";

export const isSupported = (gameId: string) => gameId === NEXUS_GAME_ID;

export const getPath = getSaveFolder;

export const test = async (
  instructions: t.IInstruction[],
): Promise<boolean> => {
  const saveFiles = instructions.filter(({ type, destination }) =>
    type === "copy" && destination && validSaveFiles.includes(destination)
  );
  return saveFiles.length >= 1 && saveFiles.length <= 4;
};

export const register = () =>
  context?.registerModType(
    SAVE_FILE_MOD_TYPE,
    80,
    isSupported,
    getPath,
    test,
    { name: "Save File", mergeMods: true },
  );
