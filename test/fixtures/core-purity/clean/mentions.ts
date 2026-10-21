// A comment may name document, window, process, setTimeout and $.
import { helper } from "./helper.ts";

const x = 1;
export const template = `cost: ${x} dollars, $ alone, window and process`;
export const anchored = /a$/;
export const word = "window";
export const key = { document: 1, process: 2 }.document;
export const read = (store: { $: number; setTimeout: number }) => store.$ + store.setTimeout;
/* A block comment: setTimeout(f) and $.fs.read(p). */
var document = { tokenize: helper };
export const local = document.tokenize;
