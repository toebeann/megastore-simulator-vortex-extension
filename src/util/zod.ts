/**
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed
 * with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {
  codec,
  config,
  type core,
  minLength,
  NEVER,
  string,
  trim,
} from "zod/mini";
import { en } from "zod/locales";

config(en());

export const jsonCodec = <T extends core.$ZodType>(schema: T) =>
  codec(string(), schema, {
    decode: (jsonString, ctx) => {
      try {
        return JSON.parse(jsonString) as any;
      } catch (err: any) {
        ctx.issues.push({
          code: "invalid_format",
          format: "json",
          input: jsonString,
          message: err.message,
        });
        return NEVER;
      }
    },
    encode: (value) => JSON.stringify(value),
  });

export const nonEmptyStringSchema = string().check(trim(), minLength(1));
