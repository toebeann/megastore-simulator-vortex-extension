import { basename, dirname, extname, join, resolve, sep } from "node:path";

import { load } from "cheerio";
import { readFile } from "fs-extra";
import { type types as t, util } from "vortex-api";

import { NEXUS_GAME_ID } from "../constants";
import {
  ADDITIONAL_PRODUCTS_PACK_DIR,
  ADDITIONAL_PRODUCTS_PACK_MOD_TYPE,
} from "../modTypes/additional-products";
import { BEPINEX_CORE_FILES } from "../util/bepinex";
import { context } from "..";
import { install as fallback } from "./fallback";

import isChildPath = util.isChildPath;

export const testSupported: t.TestSupported = async (files, gameId) => {
  const result: t.ISupportedResult = { requiredFiles: [], supported: false };
  if (gameId !== NEXUS_GAME_ID) return result;

  const sansDirectories = files
    .filter((file) => !file.endsWith(sep));

  const disallowed = ["winhttp.dll", ...BEPINEX_CORE_FILES]
    .map((name) => name.toLowerCase());

  if (
    sansDirectories
      .some((file) => disallowed.includes(basename(file).toLowerCase()))
  ) return result; // includes bepinex core files, probably a bepinex pack, this installer won't handle that

  const manifest = sansDirectories
    .find((file) => basename(file).toLowerCase() === "manifest.xml");

  result.supported = Boolean(manifest);
  return result;
};

export const install: t.InstallFunc = async (
  files,
  workingPath,
  gameId,
  progressDelegate,
  choices,
  unattended,
  archivePath,
  ...rest
) => {
  const sansDirectories = files.filter((file) => !file.endsWith(sep));
  const manifests = sansDirectories
    .filter((file) => basename(file).toLowerCase() === "manifest.xml");

  const modPathPartsLowerCase = ADDITIONAL_PRODUCTS_PACK_DIR
    .toLowerCase()
    .split(sep);

  const products = (await Promise.all(manifests.map(async (file) => {
    try {
      const path = resolve(workingPath, file);
      const text = await readFile(path, { encoding: "utf8" });
      const $ = load(text, { xml: true }, false);
      const $root = $(":root").first();
      const $name = $root.find("> Name").first();
      const dir = basename(dirname(file));
      const pack = basename(dirname(dirname(file)));

      return $root[0]!.name === "Product" && $name.length === 1 && {
        file,
        index: file.split(sep).length - 1,
        destinationDir: join(
          pack === "." || modPathPartsLowerCase.includes(pack.toLowerCase())
            ? basename(
              archivePath || workingPath,
              extname(archivePath || workingPath),
            )
            : pack,
          dir === "." || modPathPartsLowerCase.includes(dir.toLowerCase())
            ? $name.text()
            : dir,
        ),
      };
    } catch {
      return false;
    }
  }))).filter(Boolean);

  // no valid product manifests detected, use the fallback installer instead
  if (!products.length) {
    return fallback(
      files,
      workingPath,
      gameId,
      progressDelegate,
      choices,
      unattended,
      archivePath,
      ...rest,
    );
  }

  return {
    instructions: [
      { type: "setmodtype", value: ADDITIONAL_PRODUCTS_PACK_MOD_TYPE },
      ...sansDirectories.map((source) => {
        const product = products.find(({ file }) =>
          dirname(source) === dirname(file) ||
          isChildPath(source, dirname(file))
        );
        if (!product) return false;

        const { destinationDir, index } = product;
        return {
          type: "copy",
          source,
          destination: join(destinationDir, ...source.split(sep).slice(index)),
        } satisfies t.IInstruction;
      }).filter(Boolean),
    ],
  };
};

export const register = () =>
  context?.registerInstaller(
    ADDITIONAL_PRODUCTS_PACK_MOD_TYPE,
    40,
    testSupported,
    install,
  );
