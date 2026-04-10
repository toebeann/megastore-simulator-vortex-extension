/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { quote } from "shell-quote";

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

import { exec } from "../util/powershell";
import { resolveExtensionPath } from "../util/resolveExtensionPath";
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
