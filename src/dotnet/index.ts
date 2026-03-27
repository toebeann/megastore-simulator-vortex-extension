/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { dlopen } from "node:process";

import type { types as t } from "vortex-api";
import {
  array,
  boolean,
  int,
  looseObject,
  object,
  optional,
  string,
} from "zod/mini";

// @ts-expect-error
import dotnetUtils from "../../DotNetUtils/bin/aot/DotNetUtils.node" with {
  type: "file",
};
import type { Utils } from "../../DotNetUtils/bin/aot/DotNetUtils";

import { resolveExtensionPath } from "../util/resolveExtensionPath";
import { jsonCodec } from "../util/zod";

const load = (api: t.IExtensionApi) => {
  try {
    const path = resolveExtensionPath(dotnetUtils, api);
    const module: any = { exports: {} };
    dlopen(module, path);
    return module.exports.Utils as typeof Utils;
  } catch (error) {
    console.error(error);
  }
};

export const setup = (api: t.IExtensionApi) => {
  if (
    ![getApplicationVersion, analyzeAssembly, getFileVersionInfo].every(Boolean)
  ) {
    const utils = load(api);
    getApplicationVersion ??= utils?.getApplicationVersion;
    analyzeAssembly ??= utils?.analyzeAssembly;
    getFileVersionInfo ??= utils?.getFileVersionInfo;
  }
};

export let getApplicationVersion:
  | typeof Utils.getApplicationVersion
  | undefined = undefined;

export let analyzeAssembly:
  | typeof Utils.analyzeAssembly
  | undefined = undefined;

export let getFileVersionInfo:
  | typeof Utils.getFileVersionInfo
  | undefined = undefined;

export const typeRefSchema = object({ Namespace: string(), Name: string() });

export const assemblyRefSchema = object({ Name: string(), Version: string() });

export const analyzeAssemblyResultSchema = object({
  Assembly: assemblyRefSchema,
  BepInExAssemblies: array(assemblyRefSchema),
  BepInExPatcherTypes: array(typeRefSchema),
  BepInExPluginTypes: array(typeRefSchema),
});

export const analyzeAssemblyResultCodec = jsonCodec(
  analyzeAssemblyResultSchema,
);

export const fileVersionInfoSchema = looseObject({
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

export const fileVersionInfoCodec = jsonCodec(fileVersionInfoSchema);
