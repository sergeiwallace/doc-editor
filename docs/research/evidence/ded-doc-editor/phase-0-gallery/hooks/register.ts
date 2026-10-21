import type { On } from "claude-code";

import {
  COMMENTS,
  LINKS,
  MARKDOWN_LINKS,
  SELECTABLE,
  STRIKE,
  TASKS,
  bigText,
} from "./cases.ts";

const PANE_ID = "gallery";
const CASES = ["tasks", "strike", "big", "big1", "link", "comments", "keys", "sel"] as const;
type Case = (typeof CASES)[number];

/**
 * The Phase 0 gallery. `/gallery <case>` opens one pane drawing that case; `/gallery sel`
 * also reads `$.ui.selection()` and draws what it returned.
 */
export function register(on: On) {
  let current: Case = "tasks";
  let selection = "(not read yet)";

  on("session.start", async ($, e, next) => {
    await $.command.register({
      name: "gallery",
      description: `Open the spike gallery: ${CASES.join(", ")}`,
    });
    return next(e);
  });

  on("command.run", { command: "gallery" }, async ($, e) => {
    const asked = e.args.trim();
    if (!(CASES as readonly string[]).includes(asked)) {
      return { text: `gallery: unknown case "${asked}"; one of ${CASES.join(", ")}` };
    }
    current = asked as Case;
    let text: string | undefined;
    if (current === "sel") {
      const selected = await $.ui.selection();
      selection = selected === undefined ? "undefined" : JSON.stringify(selected);
      text = `gallery sel: isFullscreen=${e.presentation.isFullscreen} selection=${selection}`;
    }
    await $.ui.open({ id: PANE_ID, title: `gallery ${current}`, columns: 100, rows: 40 });
    await $.ui.invalidate("ui.render");
    return text === undefined ? {} : { text };
  });

  on("ui.render", { component: "Pane" }, async ($, e, next) => {
    if (e.requestId !== PANE_ID || e.surface !== "terminal") return next(e);
    const { Box, Text, Markdown, Link, Client } = await $.ui.resolve(e);
    const header = Text({
      key: "header",
      children: `GALLERY case=${current} fullscreen=${e.viewport?.isFullscreen} placement=${e.props.placement} body=${e.props.bodyColumns}`,
    });
    const body = (() => {
      switch (current) {
        case "tasks":
          return [Markdown({ key: "tasks", text: TASKS })];
        case "strike":
          return [Markdown({ key: "strike", text: STRIKE })];
        case "big":
          return Array.from({ length: 11 }, (_, index) =>
            Markdown({ key: `big${index + 1}`, text: bigText(index + 1, 100) }),
          );
        case "big1":
          return [Markdown({ key: "big1", text: bigText(1, 1100) })];
        case "link":
          return [
            ...LINKS.map((link) =>
              Box({
                key: link.label,
                flexDirection: "row",
                children: [
                  Text({ children: `${link.label}: ` }),
                  Link({ href: link.href, label: `${link.label} label` }),
                ],
              }),
            ),
            Markdown({ key: "mdlinks", text: MARKDOWN_LINKS }),
          ];
        case "comments":
          return COMMENTS.flatMap((comment) => [
            Text({ key: `${comment.label}-label`, dimColor: true, children: `[${comment.label}]` }),
            Markdown({ key: comment.label, text: comment.text }),
          ]);
        case "keys":
          return [Client({ key: "keys", module: "./keys.ts", height: 18 })];
        case "sel":
          return [
            Markdown({ key: "selectable", text: SELECTABLE }),
            Text({ key: "selection", children: `selection: ${selection}` }),
          ];
      }
    })();
    return Box({ flexDirection: "column", children: [header, ...body] });
  });
}
