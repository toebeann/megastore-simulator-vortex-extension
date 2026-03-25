/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { quote } from "shell-quote";
import type { types as t } from "vortex-api";

// @ts-expect-error
import script from "../../assets/analyzeAssembly.fsx" with { type: "file" };

import { analyzeAssembly, analyzeAssemblyResultCodec } from "./dotnet";
import { exec } from "./powershell";
import { resolveExtensionPath } from "./resolveExtensionPath";

export const getAssemblyAnalysis = (path: string, api?: t.IExtensionApi) => {
  try {
    if (analyzeAssembly) {
      const result = analyzeAssembly(path).trim();
      return analyzeAssemblyResultCodec.parse(result);
    }
  } catch (error) {
    console.error(error);
  }

  if (api) {
    // fallback: powershell -c `dotnet fsi analyzeAssembly.fsx $(path)`
    // much slower than dotnet .node api, but useful as our dotnet .node api is only compiled
    // for win-x64, whereas dotnet fsi should work on other architectures since net6+ is
    // guaranteed to be installed by Vortex
    try {
      const command = quote([
        "dotnet",
        "fsi",
        resolveExtensionPath(script, api),
        path,
      ]);
      return analyzeAssemblyResultCodec.parse(exec(command));
    } catch (error) {
      console.error(error);
    }
  }
};
