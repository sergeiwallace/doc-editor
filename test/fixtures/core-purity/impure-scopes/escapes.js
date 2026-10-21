// Each line from 3 on reaches a global the core must not touch.
export function f() { var document = 1; return document; }
export const page = document.title;
export function g() { { const window = 1; } return window.x; }
export const viaSelf = self.document;
export const alias = globalThis;
export const viaAlias = alias.document;
export const keyed = globalThis["document"];
export const indexed = (k) => globalThis[k];
export const loaded = require("./x.js");
export const loader = require;
export const fromWindow = window["process"];
