/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { resolve } from "node:path";

import { quote } from "shell-quote";
import type { types as t } from "vortex-api";

// @ts-expect-error
import script from "../../assets/applicationVersion.fsx" with { type: "file" };
// @ts-expect-error
import tpk from "../../assets/lz4.tpk" with { type: "file" };

import { GAME_EXE } from "../constants";
import {
  fileVersionInfoCodec,
  getApplicationVersion as _getApplicationVersion,
  getFileVersionInfo as _getFileVersionInfo,
} from "../dotnet";
import { exec } from "../util/powershell";
import { resolveExtensionPath } from "../util/resolveExtensionPath";
import { nonEmptyStringSchema } from "../util/zod";

export const getApplicationVersion = (
  gameDataPath: string,
  api: t.IExtensionApi,
) => {
  try {
    if (_getApplicationVersion) {
      const result = _getApplicationVersion(
        gameDataPath,
        resolveExtensionPath(tpk, api),
      );
      if (result) return result.trim();
    }
  } catch (error) {
    console.error(error);
  }

  // fallback: powershell -c `dotnet fsi applicationVersion.fsx $(gameDataPath) $(tpkPath)`
  // much slower than dotnet .node api, but useful as our dotnet .node api is only compiled
  // for win-x64, whereas dotnet fsi should work on other architectures since net6+ is
  // guaranteed to be installed by Vortex
  try {
    const command = quote([
      "dotnet",
      "fsi",
      resolveExtensionPath(script, api),
      gameDataPath,
      resolveExtensionPath(tpk, api),
    ]);
    return exec(command).trim();
  } catch (error) {
    console.error(error);
  }
};

export const getFileVersionInfo = (path: string) => {
  try {
    if (_getFileVersionInfo) {
      const result = _getFileVersionInfo(path).trim();
      return fileVersionInfoCodec.parse(result);
    }
  } catch (error) {
    console.error(error);
  }

  // fallback: powershell -c `(Get-Item $(path)).VersionInfo | ConvertTo-Json -Compress`
  // faster than dotnet fsi, slower than dotnet .node interface (but only marginally)
  try {
    const command = `(${
      quote(["Get-Item", path])
    }).VersionInfo | ConvertTo-Json -Compress`;
    return fileVersionInfoCodec.parse(exec(command).trim());
  } catch (error) {
    console.error(error);
  }
};

export const getGameVersion = (gamePath: string, api?: t.IExtensionApi) => {
  if (api) {
    const { data: applicationVersion } = nonEmptyStringSchema.safeParse(
      getApplicationVersion(resolve(gamePath, "Megastore Simulator_Data"), api),
    );
    if (applicationVersion) return applicationVersion;
  }

  for (const path of [GAME_EXE, "UnityPlayer.dll"]) {
    const info = getFileVersionInfo(resolve(gamePath, path));
    const version = info?.ProductVersion || info?.FileVersion;
    if (version) return version;
  }

  return "Unknown";
};
