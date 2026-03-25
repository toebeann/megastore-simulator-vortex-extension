/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { IFileInfo } from "@nexusmods/nexus-api";
import { actions, selectors, type types as t, util } from "vortex-api";

import { GAME_NAME, NEXUS_GAME_ID } from "../constants";

const { setModsEnabled: _setModsEnabled } = actions;
const { currentGame, discoveryByGame, lastActiveProfileForGame, profileById } =
  selectors;
const { toPromise } = util;

export const TRANSLATION_OPTIONS = {
  replace: {
    game: GAME_NAME,
    bepinex: "BepInEx",
  },
} as const;

export const getDiscovery = (
  state: t.IState,
  gameId = NEXUS_GAME_ID,
): t.IDiscoveryResult | undefined => discoveryByGame(state, gameId);

export const getProfile = (state: t.IState, gameId = NEXUS_GAME_ID) => {
  const id: string | undefined = lastActiveProfileForGame(state, gameId);
  if (id) return profileById(state, id);
};

export const getAllMods = (state: t.IState, gameId = NEXUS_GAME_ID) => {
  const profile = getProfile(state, gameId);
  if (!profile) return [];
  const { modState } = profile;

  const mods = Object.values(state.persistent.mods[gameId] ?? {});
  return [
    ...mods,
    ...Object.keys(modState)
      .filter((id) => !mods.map((mod) => mod.id).includes(id))
      .map((id) => ({ id, state: "uninstalled" as const })),
  ];
};

export const getEnabledMods = (state: t.IState, gameId = NEXUS_GAME_ID) => {
  const profile = getProfile(state, gameId);
  if (!profile) return [];
  const { modState } = profile;

  const table = state.persistent.mods[gameId];
  if (!table) return [];

  const mods = Object.values(table);
  const enabledModIds = Object.entries(modState)
    .filter(([_, value]) => value.enabled)
    .map(([id]) => id);
  return mods.filter((mod) => enabledModIds.includes(mod.id));
};

export const getDisabledMods = (state: t.IState, gameId = NEXUS_GAME_ID) => {
  const profile = getProfile(state, gameId);
  if (!profile) return [];
  const { modState } = profile;

  const table = state.persistent.mods[gameId];
  if (!table) return [];

  const mods = Object.values(table);
  const disabledModIds = Object.entries(modState)
    .filter(([_, value]) => !value.enabled)
    .map(([id]) => id);
  return mods.filter((mod) => disabledModIds.includes(mod.id));
};

export const getUninstalledMods = (state: t.IState, gameId = NEXUS_GAME_ID) => {
  const profile = getProfile(state, gameId);
  if (!profile) return [];
  const { modState } = profile;

  const table = state.persistent.mods[gameId];
  if (!table) return [];

  const mods = Object.values(table);
  return Object.keys(modState)
    .filter((id) => !mods.map((mod) => mod.id).includes(id))
    .map((id) => ({ id, state: "uninstalled" as const }));
};

export const reinstallMod = async (
  api: t.IExtensionApi,
  mod: t.IMod,
  gameId: string = NEXUS_GAME_ID,
): Promise<boolean> => {
  if (
    currentGame(api.getState())?.id !== gameId || !mod.attributes?.fileName ||
    !mod.archiveId
  ) {
    return false;
  }

  return await toPromise((callback) =>
    api.events.emit("start-install-download", mod.archiveId, {
      choices: mod.attributes?.installerChoices,
      allowAutoEnable: false,
    }, callback)
  );
};

export const setModsEnabled = async (
  api: t.IExtensionApi,
  enabled: boolean,
  ...modIds: string[]
) => {
  const profile = getProfile(api.getState());
  if (profile) {
    await _setModsEnabled(api, profile.id, modIds, enabled, {
      allowAutoDeploy: true,
      installed: true,
    });
  }
};

export const installMod = async (
  api: t.IExtensionApi,
  modId: number,
  filterFiles: (files: IFileInfo[]) => IFileInfo[] | void = ((files) => {
    const primary = files.find(({ is_primary }) => is_primary);
    if (primary) return [primary];

    const newestMain = files
      .filter((file) => file.category_id === 1)
      .sort(({ uploaded_timestamp: a }, { uploaded_timestamp: b }) => a - b)[0];

    if (newestMain) return [newestMain];
  }),
  gameId = NEXUS_GAME_ID,
) => {
  const files = await api.ext.nexusGetModFiles?.(gameId, modId);
  if (!files) return false;

  const filtered = filterFiles(files);
  if (!filtered || !filtered.length) return false;

  try {
    await Promise.all(filtered.map(async ({ file_id, name, file_name }) => {
      const url = `nxm://${NEXUS_GAME_ID}/mods/${modId}/files/${file_id}`;

      const downloadId = await toPromise((callback) =>
        api.events.emit(
          "start-download",
          [url],
          { game: NEXUS_GAME_ID, name },
          file_name,
          callback,
          "never",
          { allowInstall: false },
        )
      );

      const installId = await toPromise((callback) =>
        api.events.emit("start-install-download", downloadId, {
          allowAutoEnable: false,
        }, callback)
      );

      await setModsEnabled(api, true, installId);
    }));
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};
