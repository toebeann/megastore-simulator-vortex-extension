/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { basename, dirname, extname, join, resolve, sep } from "node:path";

import { isBinaryFile } from "isbinaryfile";
import { partition } from "lodash";
import { type types as t, util } from "vortex-api";

import { NEXUS_GAME_ID } from "../constants";
import { BEPINEX_CONFIG_FILE_MOD_TYPE } from "../modTypes/bepinex-config-file";
import { some } from "../util/async";
import { BEPINEX_CONFIG_DIR, BEPINEX_CORE_FILES } from "../util/bepinex";
import { context } from "..";
import { install as fallback } from "./fallback";

import isChildPath = util.isChildPath;

export const testSupported: t.TestSupported = async (files, gameId) => {
  const result: t.ISupportedResult = { requiredFiles: [], supported: false };
  if (gameId !== NEXUS_GAME_ID) return result; // wrong game

  const sansDirectories = files.filter((file) => !file.endsWith(sep));

  const disallowed = ["winhttp.dll", ...BEPINEX_CORE_FILES]
    .map((name) => name.toLowerCase());

  if (
    sansDirectories
      .some((file) => disallowed.includes(basename(file).toLowerCase()))
  ) {
    return result; // includes bepinex core files, probably a bepinex pack, this installer won't handle that
  }

  const configFile = sansDirectories
    .find((file) => extname(file).toLowerCase() === ".cfg");

  result.supported = Boolean(configFile);
  return result;
};

export const install: t.InstallFunc = async (files, workingPath, ...rest) => {
  const sansDirectories = files.filter((file) => !file.endsWith(sep));

  const configFile = sansDirectories
    .find((file) => extname(file).toLowerCase() === ".cfg")!;

  const configDir = dirname(configFile);

  const rootIndex = configDir
    .toLowerCase().split(sep).lastIndexOf(BEPINEX_CONFIG_DIR);
  const rootDir = configDir.split(sep).slice(0, rootIndex + 1).join(sep);

  const [rooted, outside] = partition(
    sansDirectories,
    (file) => dirname(file) === rootDir || isChildPath(file, rootDir),
  );

  // if any binary files found outside BepInEx\config, we don't support this archive
  if (await some(outside, (file) => isBinaryFile(resolve(workingPath, file)))) {
    return fallback(files, workingPath, ...rest);
  }

  return {
    instructions: rooted.map((source) => ({
      type: "copy",
      source,
      destination: join(
        dirname(source).split(sep).slice(rootIndex + 1).join(sep),
        basename(source),
      ),
    })),
  };
};

export const register = () =>
  context?.registerInstaller(
    BEPINEX_CONFIG_FILE_MOD_TYPE,
    35,
    testSupported,
    install,
  );
