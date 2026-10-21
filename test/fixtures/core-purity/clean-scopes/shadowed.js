// Every forbidden name below is a local of the scope that uses it.
export function title(document) {
  return document.title;
}
export function hoisted() {
  if (true) {
    return process;
  }
  var process = 1;
}
export function caught() {
  try {
    return 1;
  } catch (window) {
    return window.name;
  }
}
export function blocked() {
  {
    const setTimeout = () => 1;
    return setTimeout();
  }
}
export function tokenize() {
  const self = this;
  return function inner() {
    return self.document;
  };
}
export const named = function window() {
  return window.length;
};
export class document {
  static read() {
    return document.name;
  }
}
export function local() {
  const globalThis = { document: 1 };
  const copy = globalThis;
  return copy.document + globalThis.document;
}
export function own(require) {
  return require("./x.js");
}
export const plain = globalThis.Math.max(1, self.name ? 1 : 2);
