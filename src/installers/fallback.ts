/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { basename, dirname, join, normalize, sep } from "node:path";

import { globSync, type Options } from "fast-glob";
import { partition } from "lodash";
import { type types as t, util } from "vortex-api";

import { NEXUS_GAME_ID } from "../constants";
import { getDiscovery } from "../util/vortex";
import { context } from "..";

import isChildPath = util.isChildPath;

export const testSupported: t.TestSupported = async (_, gameId) => ({
  requiredFiles: [],
  supported: gameId === NEXUS_GAME_ID,
});

export const install: t.InstallFunc = async (files) => {
  const gamePath = getDiscovery()?.path;
  const [onlyDirs, onlyFiles] = partition(files, (file) => file.endsWith(sep));

  // TODO: implement warning letting the user know we're using a fallback and the mod may not be correctly installed
  // maybe provide links to contact me for getting the mod supported

  if (!gamePath || !onlyDirs.length) {
    return {
      instructions: [
        { type: "setmodtype", value: "dinput" },
        ...onlyFiles
          .map((source): t.IInstruction => ({
            type: "copy",
            source,
            destination: source,
          })),
      ],
    };
  }

  const options: Options = {
    cwd: gamePath,
    dot: true,
    caseSensitiveMatch: false,
    onlyFiles: false,
    onlyDirectories: true,
  };

  const sourcemap = onlyDirs.reduce((map, directory) => {
    const base = basename(directory);
    const trimmed = join(dirname(directory), base);
    const tokens = trimmed.split(sep);

    for (const match of globSync([`**/${trimmed}`, `**/${base}`], options)) {
      const matchTokens = normalize(match).split(sep);
      const { length } = matchTokens;
      const index = matchTokens.findLastIndex((token, index) =>
        token.toLowerCase() !== tokens.at(index - length)?.toLowerCase()
      ) - length + 1;

      const key = JSON.stringify([
        join(...tokens.slice(0, index)),
        join(...matchTokens.slice(0, index)),
      ]);

      map.set(key, (map.get(key) ?? 0) + index);
    }
    return map;
  }, new Map<string, number>());

  const sorted = Array.from(sourcemap.entries())
    .sort(([_, a], [__, b]) => a - b);

  return {
    instructions: [
      { type: "setmodtype", value: "dinput" },
      ...onlyFiles.reduce((instructions, source) => {
        const map = sorted.find(([key]) => {
          const [sourceDir] = JSON.parse(key) as [string, string];
          return sourceDir === "." ||
            isChildPath(source.toLowerCase(), sourceDir);
        });

        if (map) {
          const [key] = map;
          const [sourceDir, destinationDir] = JSON.parse(key) as [
            string,
            string,
          ];
          const tokens = source.split(sep);
          const { length } = sourceDir.split(sep);
          const destination = join(
            destinationDir,
            sourceDir === "." ? source : join(...tokens.slice(length)),
          );
          instructions.push({ type: "copy", source, destination });
        }

        return instructions;
      }, [] as t.IInstruction[]),
    ],
  };
};

export const register = () =>
  context?.registerInstaller("fallback", 99, testSupported, install);
