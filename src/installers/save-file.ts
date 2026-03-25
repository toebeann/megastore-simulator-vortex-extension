/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { basename, dirname, join, parse, resolve, sep } from "node:path";

import { isBinaryFile } from "isbinaryfile";
import { selectors, type types as t, util } from "vortex-api";

import { NEXUS_GAME_ID } from "../constants";
import { SAVE_FILE_MOD_TYPE } from "../modTypes/save-file";
import { some } from "../util/async";
import { BEPINEX_CORE_FILES } from "../util/bepinex";

const { installPath } = selectors;
const { getVortexPath, isChildPath } = util;

export const testSupported = async (
  api: t.IExtensionApi,
  files: string[],
  gameId: string,
  archivePath?: string,
): Promise<t.ISupportedResult> => {
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

    const validSaveFiles = Array.from(
      { length: 4 },
      (_, i) => `Save_${i}.data`,
    );
    const saveFile = sansDirectories
      .find((file) => validSaveFiles.includes(basename(file)));

    if (!saveFile) return result; // no CFG files, can't be a bepinex config file

    // get vortex working path of mod being installed
    const id = archivePath && parse(archivePath).name;
    const workingPath = id && resolve(
      installPath(api.getState()) ||
        resolve(getVortexPath("userData"), gameId, "mods"),
      `${id}.installing`,
    );

    if (!workingPath) return result; // can't find working path, short circuit and let other installers handle it

    const saveDir = dirname(saveFile);

    const outsideSaveDir = sansDirectories
      .filter((file) => !isChildPath(file, saveDir));

    // if any binary files found outside folder containing save file, we don't support this archive
    result.supported = !await some(
      outsideSaveDir,
      (file) => isBinaryFile(resolve(workingPath, file)),
    );
  } catch (e) {
    console.error(e);
  } finally {
    return result; // encountered an error checking the archive files, let other installers handle it
  }
};

interface SaveFileMapping {
}

export const install = async (api: t.IExtensionApi, files: string[]) => {
  const sansDirectories = files.filter((file) => !file.endsWith(sep));

  const validSaveFiles = Array.from({ length: 4 }, (_, i) => `Save_${i}.data`);
  const saveFiles = sansDirectories
    .filter((file) => validSaveFiles.includes(basename(file)))!;

  // TODO: check for empty save file slots
  // if there enough empty save file slots, automatically assign them
  // and tell the user which slots they have been assigned to
  //
  // otherwise, ask the user to decide which save files slots should
  // be used. probably good to display file size and modification time from
  // fs.stat.

  const rootDir = dirname(saveFiles[0]!);
  const rootIndex = rootDir.split(sep).length;
  const rooted = sansDirectories.filter((file) => isChildPath(file, rootDir));

  const instructions = rooted.map((source): t.IInstruction => ({
    type: "copy",
    source,
    destination: join(
      dirname(source).split(sep).slice(rootIndex).join(sep),
      basename(source),
    ),
  }));

  return { instructions } satisfies t.IInstallResult;
};

export const register = (context: t.IExtensionContext) =>
  context.registerInstaller(
    SAVE_FILE_MOD_TYPE,
    30,
    (files, gameId, archivePath) =>
      testSupported(context.api, files, gameId, archivePath),
    (files) => install(context.api, files),
  );
export default register;
