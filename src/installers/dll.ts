/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { basename, dirname, extname, join, resolve, sep } from "node:path";

import { some } from "async-es";
import { isBinaryFile } from "isbinaryfile";
import { partition } from "lodash";
import { coerce, satisfies } from "semver";
import { type types as t, util } from "vortex-api";

import { context } from "@";
import { NEXUS_GAME_ID } from "@/constants";
import { getAssemblyAnalysis } from "@/dotnet/getAssemblyAnalysis";
import { BEPINEX_5_PLUGIN_MOD_TYPE } from "@/modTypes/bepinex-5-plugin";
import { BEPINEX_CORE_FILES, BEPINEX_PLUGINS_DIR } from "@/util/bepinex";

import { install as fallback } from "./fallback";

import isChildPath = util.isChildPath;

export const testSupported: t.TestSupported = async (files, gameId) => {
  const result: t.ISupportedResult = { requiredFiles: [], supported: false };
  if (gameId !== NEXUS_GAME_ID) return result; // wrong game

  const sansDirectories = files
    .filter((file) => !file.endsWith(sep));

  const disallowed = ["winhttp.dll", ...BEPINEX_CORE_FILES]
    .map((name) => name.toLowerCase());

  if (
    sansDirectories
      .some((file) => disallowed.includes(basename(file).toLowerCase()))
  ) return result; // includes bepinex core files, probably a bepinex pack, this installer won't handle that

  const assembly = sansDirectories
    .find((file) => extname(file).toLowerCase() === ".dll");

  result.supported = Boolean(assembly);
  return result;
};

export const install: t.InstallFunc = async (files, workingPath, ...rest) => {
  const sansDirectories = files.filter((file) => !file.endsWith(sep));

  const plugin = sansDirectories.find((file) => {
    if (extname(file).toLowerCase() !== ".dll") return false;

    const analysis = getAssemblyAnalysis(resolve(workingPath, file));
    if (!analysis) return false;

    const { References, BepInExPluginTypes } = analysis;
    return BepInExPluginTypes.length &&
      References.some(({ Name, Version }) =>
        Name === "BepInEx" && satisfies(coerce(Version) ?? "0", "^5")
      );
  })!;

  // no bepinex 5 plugins detected, use the fallback installer instead
  if (!plugin) return fallback(files, workingPath, ...rest);

  // TODO: implement handling for bepinex 6 plugins (warn user it's not supported)
  // TODO: implement handling for melonloader mods (warn user it's not supported)

  const pluginDir = dirname(plugin);

  const rootIndex = pluginDir
    .toLowerCase().split(sep).lastIndexOf(BEPINEX_PLUGINS_DIR);
  const rootDir = pluginDir.split(sep).slice(0, rootIndex + 1).join(sep);

  const [rooted, outside] = partition(
    sansDirectories,
    (file) => dirname(file) === rootDir || isChildPath(file, rootDir),
  );

  // if any binary files found outside BepInEx\plugins, we don't support this archive
  if (
    await some(
      outside,
      (file) => isBinaryFile(resolve(workingPath, file)).catch(() => false),
    )
  ) {
    return fallback(files, workingPath, ...rest);
  }

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
    "dll-mod",
    35,
    testSupported,
    install,
  );
