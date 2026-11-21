import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { fixtureDoc, LINKED_FILE, linkedDoc } from "../plugins/doc-editor/core/fixture-docs.ts";

const fixtures = resolve(import.meta.dirname, "../docs/test/fixtures");
const read = (name: string) => readFileSync(resolve(fixtures, name), "utf8");

describe("the committed fixture documents", () => {
  it("should hold the generated 1,000-line document byte for byte", () => {
    const committed = read("thousand-line-doc.md");

    expect(committed === fixtureDoc(1000)).toBe(true);
    expect(committed.split("\n")).toHaveLength(1001);
  });

  it("should hold the linked document the fixture links to, with the heading it links to", () => {
    expect(read(LINKED_FILE)).toBe(linkedDoc());
    expect(read("thousand-line-doc.md")).toContain(`](${LINKED_FILE}#second-section)`);
    expect(linkedDoc()).toContain("## Second section");
  });
});
