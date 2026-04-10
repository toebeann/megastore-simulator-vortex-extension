/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { quote } from "shell-quote";
import { boolean, int, looseObject, optional, string } from "zod/mini";

import { exec } from "../util/powershell";
import { jsonCodec } from "../util/zod";
import { dotnet } from ".";

const fileVersionInfoCodec = jsonCodec(
  looseObject({
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
  }),
);

export const getFileVersionInfo = (path: string) => {
  try {
    const { load, System: { Diagnostics: { FileVersionInfo } } } = dotnet()!;
    load("System.Diagnostics.FileVersionInfo");
    return FileVersionInfo.GetVersionInfo(path);
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
