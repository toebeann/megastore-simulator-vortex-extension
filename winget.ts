import { $, argv } from "bun";

import { exit } from "node:process";
import { parseArgs } from "node:util";

import { pwsh } from "./pwsh";

export const install = async (
  pkg: string,
  upgrade = true,
) =>
  $`${await pwsh()} -NoProfile -NoLogo -NonInteractive -c "winget install ${pkg} ${
    upgrade ? "" : "--no-upgrade"
  }"`.nothrow();

if (import.meta.main) {
  const { values: config, positionals: [_, __, pkg] } = parseArgs({
    args: argv,
    allowPositionals: true,
    allowNegative: true,
    options: {
      upgrade: { type: "boolean", default: true },
    },
    strict: true,
  });

  if (!pkg) {
    console.warn("no package specified");
    exit();
  }

  try {
    await install(pkg, config.upgrade);
  } catch (error) {
    console.warn(error);
  }
}
