import { build, file, write } from "bun";

import { parseArgs } from "node:util";

// @ts-expect-error
import { externals } from "./node_modules/vortex-api/bin/webpack";

const banner = `/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */`;

const { values: config } = parseArgs({
  allowPositionals: true,
  allowNegative: true,
  options: {
    minify: { type: "boolean", default: true },
    features: { type: "string", multiple: true },
    drop: { type: "string", multiple: true },
  },
  strict: false,
});

await build({
  entrypoints: ["src/index.ts"],
  outdir: "dist",
  external: Object.values(externals()),
  target: "node",
  sourcemap: "inline",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  // @ts-expect-error - this option is so new that bun's type definitions haven't caught up
  metafile: { markdown: "meta.md" },
  format: "cjs",
  banner,
  optimizeImports: ["cheerio", "shell-quote", "store2"],
  naming: { asset: "[name].[ext]" },
  ...config,
});

const applicationVersion = file("dist/applicationVersion.fsx");
const applicationVersionLines = (await applicationVersion.text()).split("\n");
applicationVersionLines[
  applicationVersionLines.findIndex((line) =>
    line.startsWith("#r") && line.includes("AssetsTools.NET")
  )
] = '#r "AssetsTools.NET"';
const applicationVersionText = applicationVersionLines.join("\n");
await write(applicationVersion, applicationVersionText);
