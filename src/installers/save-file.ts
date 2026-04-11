/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { basename, dirname, join, parse, resolve, sep } from "node:path";

import { stat } from "fs-extra";
import { isBinaryFile } from "isbinaryfile";
import { quote } from "shell-quote";
import { selectors, type types as t, util } from "vortex-api";

import { NEXUS_GAME_ID } from "../constants";
import { SAVE_FILE_MOD_TYPE } from "../modTypes/save-file";
import { some } from "../util/async";
import { BEPINEX_CORE_FILES } from "../util/bepinex";
import { exec } from "../util/powershell";
import { getPersistentDataPath } from "../util/unity";
import { getState } from "../util/vortex";
import { context } from "..";

import installPath = selectors.installPath;
import getVortexPath = util.getVortexPath;
import isChildPath = util.isChildPath;
import NotSupportedError = util.NotSupportedError;

export const validSaveFiles = [
  "Save_0.data",
  "Save_1.data",
  "Save_2.data",
  "Save_3.data",
] as const;

export type ValidSaveFile = typeof validSaveFiles[number];

export const deletedSlotHash =
  "2E59EE266815625D19A361AE2ACC75720EE239B61FD892F92D1451DC3A977EB8" as const;

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

    const saveFiles = sansDirectories
      .filter((file) => validSaveFiles.includes(basename(file)));

    if (!saveFiles.length || saveFiles.length > 4) return result; // no save files (or too many), can't be a save file

    // get vortex working path of mod being installed
    const id = archivePath && parse(archivePath).name;
    const workingPath = id && resolve(
      installPath(getState()) ||
        resolve(getVortexPath("userData"), gameId, "mods"),
      `${id}.installing`,
    );

    if (!workingPath) return result; // can't find working path, short circuit and let other installers handle it

    const saveDir = dirname(saveFiles[0]!);

    const outsideSaveDir = sansDirectories.filter((file) =>
      dirname(file) !== saveDir && !isChildPath(file, saveDir)
    );

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

export const install: t.InstallFunc = async (files) => {
  interface SaveFileMapping {
    slot: ValidSaveFile;
    size: number;
    hash?: string;
    mtime?: Date;
    source?: string;
  }

  const sansDirectories = files.filter((file) => !file.endsWith(sep));

  const saveFile = sansDirectories
    .find((file) => validSaveFiles.includes(basename(file)))!;

  const rootDir = dirname(saveFile);
  const rootIndex = rootDir.split(sep).length;
  const rooted = sansDirectories
    .filter((file) => dirname(file) === rootDir || isChildPath(file, rootDir));

  const saveSlotMap = new Map(
    await Promise.all(
      validSaveFiles.map(
        async (slot): Promise<[ValidSaveFile, SaveFileMapping]> => {
          try {
            const path = resolve(getPersistentDataPath(), slot);
            const { size, mtime } = await stat(path);
            const command = [
              quote(["Get-FileHash", path]),
              quote(["Select-Object", "-Expand", "Hash"]),
            ].join("|");
            const hash = exec(command).trim();
            return [slot, { slot, size, hash, mtime }];
          } catch (e) {
            console.error(e);
            return [slot, { slot, size: 0 }]; // if we errored, it probably means the file doesn't exist
          }
        },
      ),
    ),
  );

  const emptySlots = saveSlotMap.values()
    .filter(({ source, size, hash }) =>
      !source && (size === 0 || hash === deletedSlotHash)
    ).toArray();

  const saveFiles = rooted.filter((file) =>
    dirname(file) === rootDir && validSaveFiles.includes(basename(file))
  );

  if (emptySlots.length >= saveFiles.length) {
    for (const file of saveFiles) {
      const slot = emptySlots.shift()!;
      slot.source = file;
      saveSlotMap.set(slot.slot, slot);
    }
  } else {
    // TODO: have the user choose which save files to use
    // or at the very least give some info on why it isn't supported lol
    throw new NotSupportedError();
  }

  // TODO: provide some info that steam might complain about local saves not matching what's in the cloud
  // user should choose local files over cloud if prompted

  return {
    instructions: rooted.map((source) => ({
      type: "copy",
      source,
      destination: saveFiles.includes(source)
        ? saveSlotMap.values().find((slot) => slot.source === source)!.slot
        : join(
          dirname(source).split(sep).slice(rootIndex).join(sep),
          basename(source),
        ),
    })),
  };
};

export const register = () =>
  context?.registerInstaller(SAVE_FILE_MOD_TYPE, 30, testSupported, install);
