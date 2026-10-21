// The key hint row (design, Key map; D-5): one dim line of keys, each also a Button whose hotkey
// is the key. A binding names its key, its label, the screens it acts on and what it runs, so a
// later mode adds its keys by adding bindings, not by editing a switch.

import type { Elements, RenderElement } from "claude-code";

export type Screen = "document" | "outline";

export interface KeyBinding<P> {
  /** One lowercase letter or digit: a pane hotkey takes nothing else. */
  key: string;
  label: string;
  screens: readonly Screen[];
  run: (pane: P) => void | Promise<void>;
}

/** The address of a key's Button, which a test or a focus call names. */
export const keyButton = (key: string): string => `key:${key}`;

const HOTKEY = /^[a-z0-9]$/;

/** The bindings a screen shows, in order; a later binding for the same key replaces an earlier. */
export function bindingsFor<P>(bindings: readonly KeyBinding<P>[], screen: Screen): KeyBinding<P>[] {
  const byKey = new Map<string, KeyBinding<P>>();
  for (const binding of bindings) {
    if (!HOTKEY.test(binding.key) || !binding.screens.includes(screen)) continue;
    byKey.delete(binding.key);
    byKey.set(binding.key, binding);
  }
  return [...byKey.values()];
}

/** The hint row: a wrapping row of plain, dim Buttons, one per binding. */
export function hintRow<P>(
  ui: Pick<Elements["terminal"], "Box" | "Button">,
  bindings: readonly KeyBinding<P>[],
  press: (binding: KeyBinding<P>) => void,
): RenderElement {
  return ui.Box({
    key: "hints",
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 2,
    children: bindings.map((binding) =>
      ui.Button({
        key: keyButton(binding.key),
        label: binding.label,
        hotkey: binding.key,
        plain: true,
        dimColor: true,
        onPress: () => press(binding),
      }),
    ),
  });
}

/** Rows the hint row takes at `columns`: each hint is `k: label` plus the gap. */
export function hintRows<P>(bindings: readonly KeyBinding<P>[], columns: number): number {
  let rows = 1;
  let used = 0;
  for (const binding of bindings) {
    const width = binding.key.length + 2 + binding.label.length;
    if (used > 0 && used + 2 + width > columns) {
      rows++;
      used = width;
    } else {
      used += (used > 0 ? 2 : 0) + width;
    }
  }
  return rows;
}
