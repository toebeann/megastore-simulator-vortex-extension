import { basename, dirname, extname, join, resolve, sep } from "node:path";

import { load } from "cheerio";
import { readFile } from "fs-extra";
import { selectors, type types as t, util } from "vortex-api";

import { NEXUS_GAME_ID } from "../constants";
import {
  ADDITIONAL_PRODUCTS_PACK_DIR,
  ADDITIONAL_PRODUCTS_PACK_MOD_TYPE,
} from "../modTypes/additional-products";
import { some } from "../util/async";
import { BEPINEX_CORE_FILES } from "../util/bepinex";
import { getState } from "../util/vortex";
import { context } from "..";

import installPath = selectors.installPath;
import getVortexPath = util.getVortexPath;
import isChildPath = util.isChildPath;

export const testSupported: t.TestSupported = async (
  files,
  gameId,
  archivePath,
) => {
  const result: t.ISupportedResult = { requiredFiles: [], supported: false };
  if (gameId !== NEXUS_GAME_ID || !archivePath) return result;

  try {
    const sansDirectories = files
      .filter((file) => !file.endsWith(sep));

    const disallowed = ["winhttp.dll", ...BEPINEX_CORE_FILES]
      .map((name) => name.toLowerCase());

    if (
      sansDirectories
        .some((file) => disallowed.includes(basename(file).toLowerCase()))
    ) return result; // includes bepinex core files, probably a bepinex pack, this installer won't handle that

    const manifests = sansDirectories
      .filter((file) => basename(file).toLowerCase() === "manifest.xml");

    if (!manifests.length) return result;

    // get vortex working path of mod being installed
    const id = basename(archivePath, extname(archivePath));
    const workingPath = resolve(
      installPath(getState()) ||
        resolve(getVortexPath("userData"), gameId, "mods"),
      `${id}.installing`,
    );

    result.supported = await some(manifests, async (xml) => {
      try {
        const path = resolve(workingPath, xml);
        const text = await readFile(path, { encoding: "utf8" });
        const $ = load(text, { xml: true }, false);
        const $root = $(":root").first();
        const $name = $root.find("> Name").first();
        return $root[0]!.name === "Product" && $name.length === 1;
      } catch {
        return false;
      }
    });
  } catch (e) {
    console.error(e);
  } finally {
    return result; // encountered an error checking the archive files, let other installers handle it
  }
};

export const install: t.InstallFunc = async (
  files,
  workingPath,
  _gameId,
  _progressDelegate,
  _choices,
  _unatended,
  archivePath,
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
