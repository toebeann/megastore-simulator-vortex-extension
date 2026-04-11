/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { feature } from "bun:bundle";

import { resolve } from "node:path";

import { actions, fs, selectors, type types as t, util } from "vortex-api";

// @ts-expect-error
import logo from "../assets/gameart.jpg";

import { version } from "../package.json";

import { register as registerInstallerAdditionalProductsPack } from "./installers/additional-products";
import { register as registerInstallerBepInEx } from "./installers/bepinex";
import { register as registerInstallerDll } from "./installers/dll";
import { register as registerInstallerBepInExConfigFile } from "./installers/bepinex-config-file";
import { register as registerInstallerFallback } from "./installers/fallback";
import { register as registerInstallerSaveFile } from "./installers/save-file";
import {
  ADDITIONAL_PRODUCTS_PACK_DIR,
  register as registerModTypeAdditionalProductsPack,
} from "./modTypes/additional-products";
import { register as registerModTypeBepInEx } from "./modTypes/bepinex-5";
import { register as registerModTypeBepInEx5Plugin } from "./modTypes/bepinex-5-plugin";
import { register as registerModTypeBepInExConfigFile } from "./modTypes/bepinex-config-file";
import { register as registerModTypeSaveFile } from "./modTypes/save-file";

import { dotnet } from "./dotnet";
import {
  BEPINEX_CONFIG_DIR_PATH,
  BEPINEX_LOG_FILE_PATH,
  BEPINEX_MOD_PATH,
  validateBepInEx,
} from "./util/bepinex";
import { resolveExtensionPath } from "./util/resolveExtensionPath";
import { getGameVersion, getPersistentDataPath } from "./util/unity";
import { getAllMods, getDiscovery, getState } from "./util/vortex";

import {
  handle as handleChangelog,
  migrate,
  show,
  store as changelogStore,
  transform,
} from "./changelog";
import {
  EXTENSION_NAME,
  GAME_EXE,
  GAME_NAME,
  NEXUS_GAME_ID,
  STEAM_GAME_ID,
} from "./constants";

import ensureDirWritableAsync = fs.ensureDirWritableAsync;
import currentGame = selectors.currentGame;
import profileById = selectors.profileById;

export let context: t.IExtensionContext | undefined = undefined;

export default function main(_context: t.IExtensionContext): boolean {
  context = _context;

  context.registerMigration(migrate);

  context.registerGame({
    id: NEXUS_GAME_ID,
    name: GAME_NAME,
    logo,
    mergeMods: true,
    queryModPath: () => BEPINEX_MOD_PATH,
    executable: () => GAME_EXE,
    requiredFiles: [GAME_EXE],
    environment: { SteamAPPId: STEAM_GAME_ID },
    details: { steamAppId: +STEAM_GAME_ID },
    queryArgs: { steam: [{ id: STEAM_GAME_ID }] },
    requiresLauncher: (_, store) =>
      store === "steam"
        ? { launcher: "steam", addInfo: STEAM_GAME_ID }
        : undefined,
    getGameVersion: (gamePath) => Promise.resolve(getGameVersion(gamePath)),
    contributed: "toebeann",
    defaultPrimary: true,
    version,
    setup: async (discovery) => {
      if (discovery?.path) {
        const { path } = discovery;
        await Promise.all([
          BEPINEX_MOD_PATH,
          BEPINEX_CONFIG_DIR_PATH,
          ADDITIONAL_PRODUCTS_PACK_DIR,
        ].map((dir) => ensureDirWritableAsync(resolve(path, dir))));
      }

      await handleChangelog();
      await validateBepInEx();
    },
  });

  context.registerAction(
    "mod-icons",
    1000,
    "open-ext",
    {},
    "Open Save Folder",
    () => util.opn(getPersistentDataPath()),
    () => currentGame(getState())?.id === NEXUS_GAME_ID,
  );

  context.registerAction(
    "mod-icons",
    1010,
    "open-ext",
    {},
    "Open BepInEx Folder",
    () =>
      util.opn(
        resolve(getDiscovery()!.path!, "BepInEx"),
      ),
    () => {
      const state = getState();
      const discovery = getDiscovery(state);
      const currentGameId = currentGame(state)?.id;
      return currentGameId === NEXUS_GAME_ID && Boolean(discovery?.path);
    },
  );

  context.registerAction(
    "mod-icons",
    1020,
    "open-ext",
    {},
    "Open BepInEx Config Folder",
    () => util.opn(resolve(getDiscovery()!.path!, "BepInEx", "config")),
    () => {
      const state = getState();
      const discovery = getDiscovery(state);
      const currentGameId = currentGame(state)?.id;
      return currentGameId === NEXUS_GAME_ID && Boolean(discovery?.path);
    },
  );

  context.registerAction(
    "mod-icons",
    1030,
    "open-ext",
    {},
    "Open BepInEx Log File",
    () =>
      util.opn(resolve(getDiscovery(getState())!.path!, BEPINEX_LOG_FILE_PATH)),
    () => {
      const state = getState();
      const currentGameId = currentGame(state)?.id;
      if (currentGameId !== NEXUS_GAME_ID) return false;
      const discovery = getDiscovery(state);
      return Boolean(discovery?.path);
    },
  );

  context.registerAction(
    "mod-icons",
    2000,
    "changelog",
    {},
    "Changelog",
    () => {
      const { output, input, latest } = transform();
      show(output ?? input, latest, EXTENSION_NAME);
    },
    () => currentGame(getState())?.id === NEXUS_GAME_ID,
  );

  registerModTypeBepInEx();
  registerModTypeBepInEx5Plugin();
  registerModTypeSaveFile();
  registerModTypeBepInExConfigFile();
  registerModTypeAdditionalProductsPack();

  registerInstallerBepInEx();
  registerInstallerDll();
  registerInstallerSaveFile();
  registerInstallerBepInExConfigFile();
  registerInstallerAdditionalProductsPack();
  registerInstallerFallback();

  // TODO: register an installer & mod type for bepinex patchers

  context.once(() => {
    if (feature("DEVTOOLS")) {
      Object.assign(globalThis, {
        [NEXUS_GAME_ID]: {
          context,
          extension: context?.api.extension,
          changelog: {
            transform,
            show: (async (
              config: Parameters<typeof transform>[0],
              title?: string,
            ) => {
              const { output, input, latest } = transform(config);
              return await show(output ?? input, latest, title);
            }),
          },
          dotnet,
          resolve: (path: string) => resolveExtensionPath(path),
          getAllMods,
          getDiscovery,
          getState,
          stores: { changelog: changelogStore },
          vortex: { actions, fs, selectors, util },
        },
      });
    }

    context?.api.onAsync("did-deploy", async (profileId: string) => {
      if (
        profileById(getState()!, profileId)?.gameId !== NEXUS_GAME_ID
      ) return;

      await validateBepInEx();
    });
  });

  return true;
}
