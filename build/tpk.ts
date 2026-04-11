import { argv, type BunFile, file } from "bun";

import { basename } from "node:path";
import { exit } from "node:process";
import { parseArgs } from "node:util";

import JSZip from "jszip";

export const update = async (tpk: BunFile) => {
  if (!tpk.name) throw "no file path!";

  const response = await fetch(
    "https://nightly.link/AssetRipper/Tpk/workflows/type_tree_tpk/master/lz4_file.zip",
  );

  if (response.ok) {
    const buffer = await response.arrayBuffer();
    const archive = await JSZip.loadAsync(buffer);
    const file = archive.file(basename(tpk.name));
    const outputBuffer = await file!.async("arraybuffer");
    await tpk.write(outputBuffer);
  }
};

if (import.meta.main) {
  const { values: config } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      update: { type: "boolean", default: false },
    },
    strict: true,
  });

  const tpk = file("./assets/lz4.tpk");
  const exists = await tpk.exists();

  if (!config.update && exists) exit();

  console.log(`${exists ? "updating" : "downloading"} ${tpk.name}`);

  try {
    await update(tpk);
    console.log("done");
  } catch (error) {
    console.warn(
      `failed to ${exists ? "update" : "download"} ${tpk.name}:`,
      error,
    );
  }
}
