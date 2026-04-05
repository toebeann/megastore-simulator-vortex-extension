/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type net9 from "node-api-dotnet/net9.0";
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
import nativeHostPath from "../../node_modules/node-api-dotnet/win-x64/Microsoft.JavaScript.NodeApi.node" with {
  type: "file",
};
// @ts-expect-error
import managedHostPath from "../../node_modules/node-api-dotnet/net9.0/Microsoft.JavaScript.NodeApi.DotNetHost.dll" with {
  type: "file",
};
// @ts-expect-error
import "../../node_modules/node-api-dotnet/net9.0/Microsoft.JavaScript.NodeApi.dll" with { type: "file" };
import "../../node_modules/node-api-dotnet/net9.0/Microsoft.JavaScript.NodeApi.runtimeconfig.json" with { type: "file" };

// @ts-expect-error
import dotnetUtils from "../../DotNetUtils/bin/Release/DotNetUtils.dll" with {
  type: "file",
};
import type { Utils } from "../../DotNetUtils/bin/Release/DotNetUtils";
// @ts-expect-error
import "../../DotNetUtils/bin/Release/AssetsTools.NET.dll" with { type: "file" };

import { resolveExtensionPath } from "../util/resolveExtensionPath";
import { jsonCodec } from "../util/zod";
// import { initialize } from "./init";

let dotnet: typeof net9 | undefined = undefined;

export const initialize = (api: t.IExtensionApi) => {
  if (dotnet) return dotnet;

  const nativeHost = require(resolveExtensionPath(nativeHostPath, api));
  return dotnet = nativeHost.initialize(
    "net9.0",
    resolveExtensionPath(managedHostPath, api),
    require,
    (path: string) => import(path),
  ) as typeof net9;
};

const load = (api: t.IExtensionApi) => {
  try {
    const dotnet = initialize(api);
    return dotnet.require(resolveExtensionPath(dotnetUtils, api))
      .Utils as typeof Utils;
  } catch (error) {
    console.error(error);
  }
};

export const setup = (api: t.IExtensionApi) => {
  if (
    ![getApplicationVersion, analyzeAssembly].every(Boolean)
  ) {
    const utils = load(api);
    getApplicationVersion ??= utils?.getApplicationVersion;
    analyzeAssembly ??= utils?.analyzeAssembly;
  }
};

export let getApplicationVersion:
  | typeof Utils.getApplicationVersion
  | undefined = undefined;

export let analyzeAssembly:
  | typeof Utils.analyzeAssembly
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
