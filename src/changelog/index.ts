/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { load } from "cheerio";
import { gte, lt, major, valid } from "semver";
import store2 from "store2";
import { _default, number, object, optional, string, type z } from "zod/mini";

import { context } from "@";
import { EXTENSION_ID, EXTENSION_NAME } from "@/constants";

import { getHtml } from "./macro" with { type: "macro" };

export const store = store2
  .namespace(EXTENSION_ID)
  .namespace("common-changelog")
  .namespace("draft");

const versionSchema = object({ version: string(), date: optional(number()) });
type Version = z.infer<typeof versionSchema>;

const LAST_USED = "last-version-used" as const;
const LAST_SEEN = "last-changelog-seen" as const;
const FALLBACK_VERSION = "1.0.0" as const;
const FALLBACK_DATE = "2026-03-25" as const;

const transformConfigSchema = object({
  lastSeen: _default(
    versionSchema,
    () =>
      versionSchema.safeParse(store(LAST_SEEN)).data ?? {
        version: FALLBACK_VERSION,
        date: Date.parse(FALLBACK_DATE),
      },
  ),
  lastUsed: _default(
    versionSchema,
    () =>
      versionSchema.safeParse(store(LAST_USED)).data ??
        { version: FALLBACK_VERSION },
  ),
});
type TransformConfig = z.infer<typeof transformConfigSchema>;

export const transform = (config?: Partial<TransformConfig>) => {
  const { lastSeen, lastUsed } = transformConfigSchema.parse(config || {});
  store(LAST_SEEN, lastSeen);
  store(LAST_USED, lastUsed);

  const input = getHtml();
  const $ = load(input, null, false);
  let latest: Version = { version: FALLBACK_VERSION };
  let hasImportantUpdate = false;
  let changed = false;

  const $details = $("details");
  const first = $details.first();
  if (first.length) {
    const [versionText, dateText] = $("h2", first).text().split(" - ");
    const version = valid(versionText?.trim() ?? "");
    if (version) {
      latest = {
        version,
        date: dateText ? Date.parse(dateText.trim()) : undefined,
      };
    }
  }

  const hasUpdate = lt(lastUsed.version, latest.version);

  for (const current of $details) {
    const [versionText, dateText] =
      $("h2", current).first().text().split(" - ") ?? [];
    const version = valid(versionText?.trim() ?? "");
    const date = Date.parse(dateText?.trim() ?? "");

    const seen = (version && gte(lastSeen.version, version)) ||
      (lastSeen.date && lastSeen.date >= date);

    if (seen) continue;

    const shouldOpen =
      // is new major version?
      (version && lastSeen.version &&
        major(version) > major(lastSeen.version)) ||
      // has notice?
      $("summary + p > em", current).first().text().length ||
      // has breaking change?
      $("li > strong:first-of-type", current).filter(() =>
        $(this).text().toLowerCase().includes("breaking")
      ).length;

    if (!shouldOpen) continue;

    hasImportantUpdate = true;

    const $current = $(current);
    if ($current.attr("open")) continue;

    $current.attr("open", "");
    changed = true;
  }

  return {
    latest,
    hasUpdate,
    hasImportantUpdate,
    input,
    output: changed ? $.root().html() : input,
  };
};

export const show = async (
  htmlText: string,
  latest: Version,
  title = `${EXTENSION_NAME} has been updated`,
) => {
  context?.api.showDialog?.(
    "info",
    title,
    { htmlText },
    [{
      label: "I understand",
      action: () => {
        store(LAST_SEEN, latest);
        context?.api.dismissNotification?.("extension-updated");
      },
    }],
  );
};

export const handle = async () => {
  if (!context) return;

  const { hasUpdate, latest, output, input, hasImportantUpdate } = transform();

  if (hasUpdate) {
    store(LAST_USED, latest);

    context.api.sendNotification?.({
      id: "extension-updated",
      type: "success",
      title: "Extension updated",
      message: `${EXTENSION_NAME} updated`,
      actions: [{
        title: "Changelog",
        action: () => show(output ?? input, latest),
      }],
    });
  }

  if (hasImportantUpdate) await show(output ?? input, latest);
};

export const migrate = (version: string) => {
  const lastUsed: Version = versionSchema.safeParse(store(LAST_USED)).data ??
    { version: FALLBACK_VERSION };

  if (lt(lastUsed.version, version)) store(LAST_USED, { ...lastUsed, version });
};
