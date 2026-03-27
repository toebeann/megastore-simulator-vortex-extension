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

import registerInstallerBepInEx from "./installers/bepinex";
import registerInstallerBepInEx5Plugin from "./installers/bepinex-5-plugin";
import registerInstallerBepInExConfigFile from "./installers/bepinex-config-file";
import registerInstallerSaveFile from "./installers/save-file";
import registerModTypeBepInEx from "./modTypes/bepinex-5";
import registerModTypeBepInEx5Plugin from "./modTypes/bepinex-5-plugin";
import registerModTypeBepInExConfigFile from "./modTypes/bepinex-config-file";
import registerModTypeSaveFile from "./modTypes/save-file";

import { setup as dotnetSetup } from "./dotnet";
import { getGameVersion } from "./dotnet/getGameVersion";
import {
  BEPINEX_CONFIG_DIR_PATH,
  BEPINEX_LOG_FILE_PATH,
  BEPINEX_MOD_PATH,
  validateBepInEx,
} from "./util/bepinex";
import { getSaveFolder } from "./util/getSaveFileFolder";
import { getAllMods, getDiscovery } from "./util/vortex";

import {
  handle as handleChangelog,
  migrate,
  show,
  store as changelogStore,
  transform,
} from "./changelog";
import { GAME_EXE, GAME_NAME, NEXUS_GAME_ID, STEAM_GAME_ID } from "./constants";

import ensureDirWritableAsync = fs.ensureDirWritableAsync;
import currentGame = selectors.currentGame;
import discoveryByGame = selectors.discoveryByGame;
import profileById = selectors.profileById;

export default function main(context: t.IExtensionContext): boolean {
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
    getGameVersion: (gamePath) =>
      Promise.resolve(getGameVersion(gamePath, context.api)),
    contributed: "toebeann",
    defaultPrimary: true,
    version,
    setup: async (discovery) => {
      const { api } = context;

      dotnetSetup(api);

      if (discovery?.path) {
        const { path } = discovery;
        await Promise.all([BEPINEX_MOD_PATH, BEPINEX_CONFIG_DIR_PATH]
          .map((dir) => ensureDirWritableAsync(resolve(path, dir))));
      }

      await handleChangelog(api);
      await validateBepInEx(api);
    },
  });

  context.registerAction(
    "mod-icons",
    1000,
    "open-ext",
    {},
    "Open Save Folder",
    () => util.opn(getSaveFolder()),
    () => currentGame(context.api.getState())?.id === NEXUS_GAME_ID,
  );

  context.registerAction(
    "mod-icons",
    1010,
    "open-ext",
    {},
    "Open BepInEx Folder",
    () =>
      util.opn(resolve(getDiscovery(context.api.getState())!.path!, "BepInEx")),
    () => {
      const state = context.api.getState();
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
    () =>
      util.opn(
        resolve(
          getDiscovery(context.api.getState())!.path!,
          "BepInEx",
          "config",
        ),
      ),
    () => {
      const state = context.api.getState();
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
      util.opn(
        resolve(
          getDiscovery(context.api.getState())!.path!,
          BEPINEX_LOG_FILE_PATH,
        ),
      ),
    () => {
      const state = context.api.getState();
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
      show(
        context.api,
        output ?? input,
        latest,
        "Megastore Simulator Vortex Extension",
      );
    },
    () => {
      const state = context.api.getState();
      const currentGameId = currentGame(state)?.id;
      return currentGameId === NEXUS_GAME_ID;
    },
  );

  registerModTypeBepInEx(context);
  registerModTypeBepInEx5Plugin(context);
  registerModTypeSaveFile(context);
  registerModTypeBepInExConfigFile(context);

  registerInstallerBepInEx(context);
  registerInstallerBepInEx5Plugin(context);
  registerInstallerSaveFile(context);
  registerInstallerBepInExConfigFile(context);

  // TODO: register an installer & mod type for bepinex patchers
  // TODO: register a fallback installer & mod type at prio 99 to handle archives that are rooted to the game folder

  context.once(() => {
    if (feature("DEVTOOLS")) {
      dotnetSetup(context.api);

      const getState = () => context.api.getState();
      const getDiscovery = (state = getState()) =>
        discoveryByGame(state, NEXUS_GAME_ID);

      Object.assign(globalThis, {
        [NEXUS_GAME_ID]: {
          context,
          extension: context.api.extension,
          changelog: {
            transform,
            show: (async (
              config: Parameters<typeof transform>[0],
              title?: string,
            ) => {
              const { output, input, latest } = transform(config);
              return await show(context.api, output ?? input, latest, title);
            }),
          },
          getAllMods: (gameId = NEXUS_GAME_ID) =>
            getAllMods(getState(), gameId),
          getDiscovery,
          getState,
          stores: { changelog: changelogStore },
          vortex: { actions, fs, selectors, util },
        },
      });
    }

    context.api.onAsync("did-deploy", async (profileId: string) => {
      if (
        profileById(context.api.getState(), profileId)?.gameId !== NEXUS_GAME_ID
      ) return;

      await validateBepInEx(context.api);
    });
  });

  return true;
}
