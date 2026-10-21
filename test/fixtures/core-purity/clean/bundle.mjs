// A vendored bundle declares its own locals named like the globals it must not reach.
function tokenize(effects, ok, nok) {
  const self = this;
  return self ? ok : nok;
}
var document = { tokenize };
export function parse(process) {
  return process(document);
}
export const strip = (value) => value.replace(/^ | $/g, "").replace(/[$]/g, "");
