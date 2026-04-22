import { basename, dirname, extname, join, resolve, sep } from "node:path";

import { load } from "cheerio";
import { readFile } from "fs-extra";
import { type types as t, util } from "vortex-api";

import { context } from "@";
import { NEXUS_GAME_ID } from "@/constants";
import {
  ADDITIONAL_PRODUCTS_PACK_DIR,
  ADDITIONAL_PRODUCTS_PACK_MOD_TYPE,
} from "@/modTypes/additional-products";
import { BEPINEX_CORE_FILES } from "@/util/bepinex";

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

  const modDirNameLowerCase = basename(ADDITIONAL_PRODUCTS_PACK_DIR)
    .toLowerCase();

  const products = (await Promise.all(manifests.map(async (file) => {
    try {
      const text = await readFile(
        resolve(workingPath, file),
        { encoding: "utf8" },
      );
      const $ = load(text, { xml: true }, false);
      const $root = $(":root").first();
      const $name = $root.find("> Name").first();
      if ($root[0]!.name !== "Product" || $name.length !== 1) return false;

      const tokens = file.split(sep);
      const tokensLowerCase = file.toLowerCase().split(sep);
      const index = tokens.length - 1;
      const bestPath = archivePath || workingPath;
      const destinationDirTokens = tokens.slice(
        tokensLowerCase.indexOf(modDirNameLowerCase) + 1,
        index,
      );
      const destinationDir = join(
        destinationDirTokens.length > 1
          ? ""
          : destinationDirTokens.length === 1
          ? basename(bestPath, extname(bestPath))
          : join(basename(bestPath, extname(bestPath)), $name.text()),
        ...destinationDirTokens,
      );

      return { file, index, destinationDir };
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
