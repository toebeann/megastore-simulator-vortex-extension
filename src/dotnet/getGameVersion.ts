/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { resolve } from "node:path";

import { quote } from "shell-quote";
import { boolean, int, looseObject, optional, string } from "zod/mini";

// @ts-expect-error
import script from "../../assets/applicationVersion.fsx" with { type: "file" };
// @ts-expect-error
import tpk from "../../assets/lz4.tpk" with { type: "file" };
import type { Utils } from "../../DotNetUtils/bin/Release/DotNetUtils";
// @ts-expect-error
import dotnetUtils from "../../DotNetUtils/bin/Release/DotNetUtils.dll" with {
  type: "file",
};
// @ts-expect-error
import "../../DotNetUtils/bin/Release/AssetsTools.NET.dll" with { type: "file" };

import { GAME_EXE } from "../constants";
import { exec } from "../util/powershell";
import { resolveExtensionPath } from "../util/resolveExtensionPath";
import { jsonCodec, nonEmptyStringSchema } from "../util/zod";
import { dotnet } from ".";

export const getApplicationVersion = (gameDataPath: string) => {
  try {
    const utils: typeof Utils = dotnet()!
      .require(resolveExtensionPath(dotnetUtils)).Utils;
    const result = utils.getApplicationVersion(
      gameDataPath,
      resolveExtensionPath(tpk),
    )?.trim();
    if (result) return result;
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
      resolveExtensionPath(script),
      gameDataPath,
      resolveExtensionPath(tpk),
    ]);
    return exec(command).trim();
  } catch (error) {
    console.error(error);
  }
};

const fileVersionInfoSchema = looseObject({
  Comments: optional(string()),
  CompanyName: optional(string()),
  FileBuildPart: int(),
  FileDescription: optional(string()),
  FileMajorPart: int(),
  FileMinorPart: int(),
  FileName: string(),
  FilePrivatePart: int(),
  FileVersion: optional(string()),
  InternalName: optional(string()),
  IsDebug: boolean(),
  IsPatched: boolean(),
  IsPrivateBuild: boolean(),
  IsPreRelease: boolean(),
  IsSpecialBuild: boolean(),
  Language: optional(string()),
  LegalCopyright: optional(string()),
  LegalTrademarks: optional(string()),
  OriginalFilename: optional(string()),
  PrivateBuild: optional(string()),
  ProductBuildPart: int(),
  ProductMajorPart: int(),
  ProductMinorPart: int(),
  ProductName: optional(string()),
  ProductPrivatePart: int(),
  ProductVersion: optional(string()),
  SpecialBuild: optional(string()),
});

const fileVersionInfoCodec = jsonCodec(fileVersionInfoSchema);

export const getFileVersionInfo = (path: string) => {
  try {
    // @ts-expect-error
    const { load, System } = dotnet()!;
    load("System.Diagnostics.FileVersionInfo");
    return fileVersionInfoSchema.parse(
      System.Diagnostics.FileVersionInfo.GetVersionInfo(path),
    );
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

export const getGameVersion = (gamePath: string) => {
  const { data: applicationVersion } = nonEmptyStringSchema.safeParse(
    getApplicationVersion(resolve(gamePath, "Megastore Simulator_Data")),
  );
  if (applicationVersion) return applicationVersion;

  for (const path of [GAME_EXE, "UnityPlayer.dll"]) {
    const info = getFileVersionInfo(resolve(gamePath, path));
    const version = info?.ProductVersion || info?.FileVersion;
    if (version) return version;
  }

  return "Unknown";
};
