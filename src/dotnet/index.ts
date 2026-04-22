/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type net9 from "node-api-dotnet/net9.0";

// @ts-expect-error
import nativeHostPath from "node-api-dotnet/win-x64/Microsoft.JavaScript.NodeApi.node" with {
  type: "file",
};
// @ts-expect-error
import managedHostPath from "node-api-dotnet/net9.0/Microsoft.JavaScript.NodeApi.DotNetHost.dll" with {
  type: "file",
};
// @ts-expect-error
import "node-api-dotnet/net9.0/Microsoft.JavaScript.NodeApi.dll" with { type: "file" };
import "node-api-dotnet/net9.0/Microsoft.JavaScript.NodeApi.runtimeconfig.json" with { type: "file" };

import { resolveExtensionPath } from "@/util/resolveExtensionPath";

let _dotnet: typeof net9 | undefined = undefined;

export const dotnet = () => {
  if (_dotnet) return _dotnet;

  try {
    const nativeHost = require(resolveExtensionPath(nativeHostPath));
    return _dotnet = nativeHost.initialize(
      "net9.0",
      resolveExtensionPath(managedHostPath),
      require,
      (path: string) => import(path),
    ) as typeof net9;
  } catch {}
};
