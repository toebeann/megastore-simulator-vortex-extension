/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { join, resolve } from "node:path";

import { access } from "fs-extra";

import { BEPINEX_5_MOD_TYPE } from "../modTypes/bepinex-5";

import {
  getDisabledMods,
  getDiscovery,
  getEnabledMods,
  getState,
  installMod,
  setModsEnabled,
  TRANSLATION_OPTIONS,
} from "./vortex";
import { context } from "..";

export const BEPINEX_NEXUS_ID = 2;

export const BEPINEX_DIR = "BepInEx";

export const BEPINEX_CORE_DIR = "core";

export const BEPINEX_CONFIG_DIR = "config";

export const BEPINEX_PLUGINS_DIR = "plugins";

export const BEPINEX_LOG_FILE_PATH = join(BEPINEX_DIR, "LogOutput.log");

export const BEPINEX_CONFIG_DIR_PATH = join(BEPINEX_DIR, BEPINEX_CONFIG_DIR);

export const BEPINEX_MOD_PATH = join(BEPINEX_DIR, BEPINEX_PLUGINS_DIR);

export const BEPINEX_CORE_FILES = [
  "BepInEx.dll",
  "0Harmony.dll",
  "Mono.Cecil.dll",
  "MonoMod.RuntimeDetour.dll",
  "MonoMod.Utils.dll",
] as const;

export const isBepInExEnabled = (state = getState()) =>
  getEnabledMods(state).some(({ type }) => type === BEPINEX_5_MOD_TYPE);

export const isBepInExCoreInstalled = async (
  state = getState(),
  discovery = getDiscovery(state),
) => {
  if (!discovery?.path) return false;

  const { path } = discovery;

  try {
    await Promise.all(BEPINEX_CORE_FILES
      .map((file) =>
        access(resolve(path, BEPINEX_DIR, BEPINEX_CORE_DIR, file))
      ));
    return true;
  } catch {
    return false;
  }
};

export const validateBepInEx = async () => {
  const state = getState()!;
  if (
    !isBepInExEnabled(state) &&
    !(await isBepInExCoreInstalled(state))
  ) {
    const potentials = getDisabledMods(state)
      .filter(({ type }) => type === BEPINEX_5_MOD_TYPE);
    const disabledBepInEx = potentials.length === 1 ? potentials[0] : undefined;

    const { api: { sendNotification, translate } } = context!;

    sendNotification?.({
      id: "bepinex-missing",
      type: "warning",
      title: translate(
        `{{bepinex}} is ${disabledBepInEx ? "disabled" : "not installed"}`,
        TRANSLATION_OPTIONS,
      ),
      message: translate(
        "{{bepinex}} is required to mod {{game}}",
        TRANSLATION_OPTIONS,
      ),
      actions: [
        disabledBepInEx
          ? {
            title: translate("Enable"),
            action: () => setModsEnabled(true, disabledBepInEx.id),
          }
          : {
            title: translate("Install", TRANSLATION_OPTIONS),
            action: () => installMod(BEPINEX_NEXUS_ID),
          },
      ],
    });
  } else {
    const { api: { dismissNotification } } = context!;
    dismissNotification?.("bepinex-missing");
  }
};
