/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { resolve } from "node:path";

import type { types as t } from "vortex-api";

export const resolveExtensionPath = (path: string, api: t.IExtensionApi) =>
  resolve(api.extension?.path ?? "", path);
