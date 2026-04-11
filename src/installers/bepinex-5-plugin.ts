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
import { coerce, satisfies } from "semver";
import { selectors, type types as t, util } from "vortex-api";

import { NEXUS_GAME_ID } from "../constants";
import { getAssemblyAnalysis } from "../dotnet/getAssemblyAnalysis";
import { BEPINEX_5_PLUGIN_MOD_TYPE } from "../modTypes/bepinex-5-plugin";
import { some } from "../util/async";
import { BEPINEX_CORE_FILES, BEPINEX_PLUGINS_DIR } from "../util/bepinex";
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
    const sansDirectories = files
      .filter((file) => !file.endsWith(sep));

    const disallowed = ["winhttp.dll", ...BEPINEX_CORE_FILES]
      .map((name) => name.toLowerCase());

    if (
      sansDirectories
        .some((file) => disallowed.includes(basename(file).toLowerCase()))
    ) return result; // includes bepinex core files, probably a bepinex pack, this installer won't handle that

    const assemblies = sansDirectories
      .filter((file) => extname(file).toLowerCase() === ".dll");

    if (!assemblies.length) return result; // no DLL files, can't be a bepinex plugin

    // get vortex working path of mod being installed
    const { api: { getPath } } = context!;
    const id = archivePath && parse(archivePath).name;
    const workingPath = id && resolve(
      installPath(getState()) ||
        resolve(getPath("userData"), gameId, "mods"),
      `${id}.installing`,
    );

    if (!workingPath) return result; // can't find working path, short circuit and let other installers handle it

    const plugins = assemblies.filter((assembly) => {
      const analysis = getAssemblyAnalysis(resolve(workingPath, assembly));
      if (!analysis) return false;

      const { BepInExAssemblies, BepInExPluginTypes } = analysis;
      return BepInExPluginTypes.length &&
        BepInExAssemblies.some(({ Name, Version }) =>
          Name === "BepInEx" && satisfies(coerce(Version) ?? "0", "^5")
        );
    });

    if (!plugins.length) return result; // no bepinex 5 plugins in archive

    const pluginDir = dirname(plugins[0]!);

    const rootIndex = pluginDir
      .toLowerCase().split(sep).lastIndexOf(BEPINEX_PLUGINS_DIR);
    const rootDir = pluginDir.split(sep).slice(0, rootIndex + 1).join(sep);

    const outsideRoot = sansDirectories.filter((file) =>
      dirname(file) !== rootDir && !isChildPath(file, rootDir)
    );

    // if any binary files found outside BepInEx\plugins, we don't support this archive
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

export const install: t.InstallFunc = async (files, workingPath) => {
  const sansDirectories = files.filter((file) => !file.endsWith(sep));
  const plugin = sansDirectories.find((file) => {
    if (extname(file).toLowerCase() !== ".dll") return false;

    const analysis = getAssemblyAnalysis(resolve(workingPath, file));
    if (!analysis) return false;

    const { BepInExAssemblies, BepInExPluginTypes } = analysis;
    return BepInExPluginTypes.length &&
      BepInExAssemblies.some(({ Name, Version }) =>
        Name === "BepInEx" && satisfies(coerce(Version) ?? "0", "^5")
      );
  })!;
  const pluginDir = dirname(plugin);

  const rootIndex = pluginDir
    .toLowerCase().split(sep).lastIndexOf(BEPINEX_PLUGINS_DIR);
  const rootDir = pluginDir.split(sep).slice(0, rootIndex + 1).join(sep);
  const rooted = sansDirectories
    .filter((file) => dirname(file) === rootDir || isChildPath(file, rootDir));

  return {
    instructions: [
      { type: "setmodtype", value: BEPINEX_5_PLUGIN_MOD_TYPE },
      ...rooted.map((source): t.IInstruction => ({
        type: "copy",
        source,
        destination: join(
          dirname(source).split(sep).slice(rootIndex + 1).join(sep),
          basename(source),
        ),
      })),
    ],
  };
};

export const register = () =>
  context?.registerInstaller(
    BEPINEX_5_PLUGIN_MOD_TYPE,
    35,
    testSupported,
    install,
  );
