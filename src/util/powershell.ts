/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {
  type ExecFileOptionsWithStringEncoding,
  execSync,
} from "node:child_process";

export const exec = (
  command: string,
  options: ExecFileOptionsWithStringEncoding = {},
) => {
  try {
    return execSync(command, {
      windowsHide: true,
      encoding: "utf8",
      ...options,
      shell: "pwsh",
    });
  } catch (e) {
    return execSync(command, {
      windowsHide: true,
      encoding: "utf8",
      ...options,
      shell: "powershell",
    });
  }
};
