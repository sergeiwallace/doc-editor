import { expect, test } from "claude-code/testing";

import { helper } from "./helper.ts";

test("should answer one when the helper runs", () => {
  expect(helper()).toBe(1);
});
