/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { resolve } from "node:path";

import parseAcf from "steam-acf-parser";
import { fs, type types as t } from "vortex-api";

import { STEAM_GAME_ID } from "../constants";
import { getDiscovery } from "./vortex";
import { nonEmptyStringSchema } from "./zod";

const { readFileAsync } = fs;

export const getManifestPath = (
  state: t.IState,
  discovery = getDiscovery(state),
) => {
  if (discovery?.path && discovery?.store === "steam") {
    return resolve(
      discovery.path,
      "..",
      "..",
      `appmanifest_${STEAM_GAME_ID}.acf`,
    );
  }
};

export const getManifest = async (
  state: t.IState,
  discovery = getDiscovery(state),
) => {
  const path = getManifestPath(state, discovery);
  if (path) {
    const data = await readFileAsync(path, { encoding: "utf8" });
    const { data: text } = nonEmptyStringSchema.safeParse(data);
    if (text) return parseAcf(text);
  }
};

export const getBranch = async (
  state: t.IState,
  discovery = getDiscovery(state),
) => {
  if (discovery?.store !== "steam" || !discovery.path) return "public"; // assume public branch

  try {
    const manifest = await getManifest(state, discovery);
    if (manifest) {
      const { AppState: { UserConfig, MountedConfig } } = manifest;
      const { data: branch } = nonEmptyStringSchema.safeParse(
        MountedConfig?.BetaKey || UserConfig?.BetaKey,
      );
      return branch || "public";
    }
  } catch (e) {
    console.error(e);
  }
  return "public";
};
