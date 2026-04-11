/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { join, sep } from "node:path";

import type { types as t } from "vortex-api";

import { NEXUS_GAME_ID } from "../constants";
import {
  BEPINEX_CORE_DIR,
  BEPINEX_CORE_FILES,
  BEPINEX_DIR,
} from "../util/bepinex";
import { context } from "..";

export const testSupported: t.TestSupported = async (files, gameId) => {
  const result: t.ISupportedResult = { requiredFiles: [], supported: false };
  if (gameId !== NEXUS_GAME_ID) return result;

  const filesLowerCase = files
    .filter((file) => !file.endsWith(sep))
    .map((file) => file.toLowerCase());

  result.supported = filesLowerCase
    .some((file) => file.split(sep)[0] === BEPINEX_DIR.toLowerCase()) &&
    BEPINEX_CORE_FILES.every((file) =>
      filesLowerCase
        .includes(join(BEPINEX_DIR, BEPINEX_CORE_DIR, file).toLowerCase())
    );

  return result;
};

export const install: t.InstallFunc = async (files) => {
  context?.api.dismissNotification?.("bepinex-missing");
  return {
    instructions: [
      ...files
        .filter((file) => !file.endsWith(sep))
        .map((source): t.IInstruction => ({
          type: "copy",
          source,
          destination: source,
        })),
    ],
  };
};

export const register = () =>
  context?.registerInstaller("bepinex", 50, testSupported, install);
