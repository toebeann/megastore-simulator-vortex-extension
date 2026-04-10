import { homedir } from "node:os";
import { resolve } from "node:path";

import { readFileSync } from "fs-extra";

import {
  GAME_DATA_FOLDER,
  GAME_EXE,
  GAME_NAME,
  GAME_PUBLISHER,
} from "../constants";
import { getApplicationVersion } from "../dotnet/getApplicationVersion";
import { getFileVersionInfo } from "../dotnet/getFileVersionInfo";

import { getDiscovery } from "./vortex";
import { nonEmptyStringSchema } from "./zod";

export const getGameVersion = (gamePath = getDiscovery()?.path) => {
  if (gamePath) {
    const { data: applicationVersion } = nonEmptyStringSchema.safeParse(
      getApplicationVersion(resolve(gamePath, GAME_DATA_FOLDER)),
    );
    if (applicationVersion) return applicationVersion;

    for (const path of [GAME_EXE, "UnityPlayer.dll"]) {
      const info = getFileVersionInfo(resolve(path, path));
      const version = info?.ProductVersion || info?.FileVersion;
      if (version) return version;
    }
  }

  return "Unknown";
};

export const getPersistentDataPath = (gamePath = getDiscovery()?.path) => {
  let publisher = GAME_PUBLISHER;
  let name = GAME_NAME;

  try {
    if (gamePath) {
      const lines = readFileSync(
        resolve(gamePath, GAME_DATA_FOLDER, "app.info"),
        { encoding: "utf8" },
      ).split("\n").map((s) => s.trim());
      if (lines.length >= 2) {
        [publisher, name] = lines as [string, string];
      }
    }
  } finally {
    return resolve(
      homedir(),
      "AppData",
      "LocalLow",
      publisher,
      name,
    );
  }
};
