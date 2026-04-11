/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {
  basename,
  dirname,
  extname,
  join,
  parse,
  resolve,
  sep,
} from "node:path";

import { isBinaryFile } from "isbinaryfile";
import { selectors, type types as t, util } from "vortex-api";

import { NEXUS_GAME_ID } from "../constants";
import { BEPINEX_CONFIG_FILE_MOD_TYPE } from "../modTypes/bepinex-config-file";
import { some } from "../util/async";
import { BEPINEX_CONFIG_DIR, BEPINEX_CORE_FILES } from "../util/bepinex";
import { getState } from "../util/vortex";
import { context } from "..";

import installPath = selectors.installPath;
import isChildPath = util.isChildPath;

export const testSupported: t.TestSupported = async (
  files,
  gameId,
  archivePath,
) => {
  const result: t.ISupportedResult = { requiredFiles: [], supported: false };
  if (gameId !== NEXUS_GAME_ID) return result; // wrong game

  try {
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

    if (!configFile) return result; // no CFG files, can't be a bepinex config file

    // get vortex working path of mod being installed
    const { api: { getPath } } = context!;
    const id = archivePath && parse(archivePath).name;
    const workingPath = id && resolve(
      installPath(getState()) ||
        resolve(getPath("userData"), gameId, "mods"),
      `${id}.installing`,
    );

    if (!workingPath) return result; // can't find working path, short circuit and let other installers handle it

    const configDir = dirname(configFile);

    const rootIndex = configDir
      .toLowerCase().split(sep).lastIndexOf(BEPINEX_CONFIG_DIR);
    const rootDir = configDir.split(sep).slice(0, rootIndex + 1).join(sep);

    const outsideRoot = sansDirectories.filter((file) =>
      dirname(file) !== rootDir && !isChildPath(file, rootDir)
    );

    // if any binary files found outside BepInEx\config, we don't support this archive
    result.supported = !await some(
      outsideRoot,
      (file) => isBinaryFile(resolve(workingPath, file)),
    );
  } catch (e) {
    console.error(e);
  } finally {
    return result; // encountered an error checking the archive files, let other installers handle it
  }
};

export const install: t.InstallFunc = async (files) => {
  const sansDirectories = files.filter((file) => !file.endsWith(sep));

  const configFile = sansDirectories
    .find((file) => extname(file).toLowerCase() === ".cfg")!;

  const configDir = dirname(configFile);

  const rootIndex = configDir
    .toLowerCase().split(sep).lastIndexOf(BEPINEX_CONFIG_DIR);
  const rootDir = configDir.split(sep).slice(0, rootIndex + 1).join(sep);
  const rooted = sansDirectories
    .filter((file) => dirname(file) === rootDir || isChildPath(file, rootDir));

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
