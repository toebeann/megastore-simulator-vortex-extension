/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { types as t } from "vortex-api";

import { NEXUS_GAME_ID } from "../constants";
import { getSaveFolder } from "../util/getSaveFileFolder";

export const SAVE_FILE_MOD_TYPE = "save-file";

export const isSupported = (gameId: string) => gameId === NEXUS_GAME_ID;

export const getPath = getSaveFolder;

export const test = async (
  instructions: t.IInstruction[],
): Promise<boolean> => {
  const validSaveFiles = Array.from({ length: 4 }, (_, i) => `Save_${i}.data`);
  return instructions.some(({ type, destination }) =>
    type === "copy" && destination && validSaveFiles.includes(destination)
  );
};

export const register = (context: t.IExtensionContext) =>
  context.registerModType(
    SAVE_FILE_MOD_TYPE,
    80,
    isSupported,
    getPath,
    test,
    { name: "Save File", mergeMods: true },
  );
export default register;
