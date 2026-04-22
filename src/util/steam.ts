/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { resolve } from "node:path";

import { readFile } from "fs-extra";
import parseAcf from "steam-acf-parser";

import { STEAM_GAME_ID } from "@/constants";

import { getDiscovery } from "./vortex";
import { nonEmptyStringSchema } from "./zod";

export const getManifestPath = () => {
  const discovery = getDiscovery();
  if (discovery?.path && discovery?.store === "steam") {
    return resolve(
      discovery.path,
      "..",
      "..",
      `appmanifest_${STEAM_GAME_ID}.acf`,
    );
  }
};

export const getManifest = async () => {
  const path = getManifestPath();
  if (path) {
    const data = await readFile(path, { encoding: "utf8" });
    const { data: text } = nonEmptyStringSchema.safeParse(data);
    if (text) return parseAcf(text);
  }
};

export const getBranch = async () => {
  const discovery = getDiscovery();
  if (discovery?.store !== "steam" || !discovery.path) return "public"; // assume public branch

  try {
    const manifest = await getManifest();
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
