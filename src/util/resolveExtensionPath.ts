/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { resolve } from "node:path";

import { context } from "..";

export const resolveExtensionPath = (path: string) =>
  resolve(context?.api.extension?.path ?? "", path);
