/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { IFileInfo } from "@nexusmods/nexus-api";
import { actions, selectors, type types as t, util } from "vortex-api";

import { GAME_NAME, NEXUS_GAME_ID } from "../constants";
import { context } from "..";

import _setModsEnabled = actions.setModsEnabled;
import currentGame = selectors.currentGame;
import discoveryByGame = selectors.discoveryByGame;
import lastActiveProfileForGame = selectors.lastActiveProfileForGame;
import profileById = selectors.profileById;
import _toPromise = util.toPromise;

export const TRANSLATION_OPTIONS = {
  replace: {
    game: GAME_NAME,
    bepinex: "BepInEx",
  },
} as const;

export const getState = () => context?.api.getState();

export const getDiscovery = (
  state = getState(),
  gameId = NEXUS_GAME_ID,
): t.IDiscoveryResult | undefined => discoveryByGame(state, gameId);

export const getProfile = (state = getState()!, gameId = NEXUS_GAME_ID) => {
  const id: string | undefined = lastActiveProfileForGame(state, gameId);
  if (id) return profileById(state, id);
};

export const getAllMods = (state = getState()!, gameId = NEXUS_GAME_ID) => {
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

export const getEnabledMods = (state = getState()!, gameId = NEXUS_GAME_ID) => {
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

export const getDisabledMods = (
  state = getState()!,
  gameId = NEXUS_GAME_ID,
) => {
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

export const getUninstalledMods = (
  state = getState()!,
  gameId = NEXUS_GAME_ID,
) => {
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

const reinstallMod = async (
  mod: t.IMod,
  gameId: string = NEXUS_GAME_ID,
): Promise<boolean> => {
  if (
    currentGame(getState())?.id !== gameId || !mod.attributes?.fileName ||
    !mod.archiveId
  ) {
    return false;
  }

  try {
    await startInstallDownload(mod.archiveId, {
      choices: mod.attributes?.installerChoices,
      allowAutoEnable: false,
    });
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const setModsEnabled = async (enabled: boolean, ...modIds: string[]) => {
  if (context) {
    const profile = getProfile(getState());
    if (profile) {
      await _setModsEnabled(context.api, profile.id, modIds, enabled, {
        allowAutoDeploy: true,
        installed: true,
      });
    }
  }
};

export const installMod = async (
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
  const files = await context?.api.ext.nexusGetModFiles?.(gameId, modId);
  if (!files) return false;

  const filtered = filterFiles(files);
  if (!filtered || !filtered.length) return false;

  try {
    await Promise.all(filtered.map(async ({ file_id, name, file_name }) => {
      const url = `nxm://${NEXUS_GAME_ID}/mods/${modId}/files/${file_id}`;

      const downloadId = await startDownload(
        [url],
        { game: NEXUS_GAME_ID, name },
        file_name,
        "never",
        { allowInstall: false },
      );

      const installId = await startInstallDownload(
        downloadId,
        { allowAutoEnable: false },
        "bepinex",
      );

      await setModsEnabled(true, installId);
    }));
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

const toPromise = <T = unknown, E = unknown>(
  func: (cb: (error: E, result: T) => any) => void,
): Promise<T> => _toPromise(func);

const startDownload = (
  urls: string[],
  modInfo: t.IModInfo,
  fileName: string,
  redownload?: string,
  ...rest: any[]
) =>
  toPromise<string>((callback) =>
    context?.api.events.emit(
      "start-download",
      urls,
      modInfo,
      fileName,
      callback,
      redownload,
      ...rest,
    )
  );

const startInstallDownload = (
  downloadId: string,
  allowAutoEnable?: boolean | {
    allowAutoEnable?: boolean;
    [x: string]: unknown;
  },
  forceInstaller?: string,
  ...rest: any[]
) =>
  toPromise<string>((callback) =>
    context?.api.events.emit(
      "start-install-download",
      downloadId,
      allowAutoEnable,
      callback,
      forceInstaller,
      ...rest,
    )
  );
