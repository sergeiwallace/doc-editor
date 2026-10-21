import x from "micromark";
import { readFile } from "node:fs";
import { test } from "claude-code/testing";
import { helper } from "../clean/helper.ts";

export * from "micromark-util-types";
export const late = (name: string) => import("./" + name);
export { x, readFile, test, helper };
