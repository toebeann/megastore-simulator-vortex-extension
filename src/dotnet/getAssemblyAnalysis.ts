/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { quote } from "shell-quote";
import { array, object, string } from "zod/mini";

// @ts-expect-error
import script from "assets/analyzeAssembly.fsx" with { type: "file" };

// @ts-expect-error
import dotnetUtils from "DotNetUtils/DotNetUtils.dll" with { type: "file" };
import type { Utils } from "DotNetUtils/DotNetUtils";

import { exec } from "@/util/powershell";
import { resolveExtensionPath } from "@/util/resolveExtensionPath";
import { jsonCodec } from "@/util/zod";

import { dotnet } from ".";

const typeRefSchema = object({ Namespace: string(), Name: string() });

const assemblyRefSchema = object({ Name: string(), Version: string() });

const analyzeAssemblyResultSchema = object({
  Assembly: assemblyRefSchema,
  BepInExAssemblies: array(assemblyRefSchema),
  BepInExPatcherTypes: array(typeRefSchema),
  BepInExPluginTypes: array(typeRefSchema),
});

const analyzeAssemblyResultCodec = jsonCodec(
  analyzeAssemblyResultSchema,
);

export const getAssemblyAnalysis = (path: string) => {
  try {
    const utils: typeof Utils = dotnet()!
      .require(resolveExtensionPath(dotnetUtils)).Utils;
    const result = utils.analyzeAssembly(path).trim();
    return analyzeAssemblyResultCodec.parse(result);
  } catch (error) {
    console.error(error);
  }

  // fallback: powershell -c `dotnet fsi analyzeAssembly.fsx $(path)`
  // much slower than dotnet .node api, but useful as our dotnet .node api is only compiled
  // for win-x64, whereas dotnet fsi should work on other architectures since net6+ is
  // guaranteed to be installed by Vortex
  try {
    const command = quote([
      "dotnet",
      "fsi",
      resolveExtensionPath(script),
      path,
    ]);
    return analyzeAssemblyResultCodec.parse(exec(command));
  } catch (error) {
    console.error(error);
  }
};
