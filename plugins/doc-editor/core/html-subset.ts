// A small HTML-to-Markdown converter for the HTML that appears inside Markdown: inline tags,
// <br>, <details>, images, simple lists and tables, entities and comments. No DOM: a tag scanner
// over the text. Anything it does not know keeps its text and loses its tags.

export type HtmlContext = "flow" | "inline" | "cell";

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "-",
  hellip: "…",
  copy: "©",
  reg: "®",
  trade: "™",
};

/** Decodes named, decimal and hexadecimal character references; an unknown one stays as text. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (whole, name: string) => {
    if (name.startsWith("#")) {
      const code = name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[name.toLowerCase()] ?? whole;
  });
}

const attribute = (tag: string, name: string): string | null => {
  const match = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  if (match === null) return null;
  return decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
};

const percent = (c: string): string => {
  const code = c.charCodeAt(0);
  return code < 0x80 ? `%${code.toString(16).toUpperCase().padStart(2, "0")}` : encodeURIComponent(c);
};

/**
 * An href made safe to write as a Markdown link destination: every character that could end the
 * destination or open another construct (spaces, brackets, parentheses, quotes, backslashes,
 * backticks, control characters) is percent-encoded. Check the result, not the input, before
 * drawing it as a link.
 */
export function linkDestination(url: string): string {
  return url.replace(/[\s()<>[\]\\`"'\u0000-\u001f\u007f]/g, percent);
}

/**
 * Link text made safe inside `[...]`: an unescaped bracket is escaped, so the text can neither
 * close the link nor open another, and a trailing odd backslash cannot escape the closing `]`.
 */
export function linkLabel(label: string): string {
  const escaped = label.replace(/(\\*)([[\]])/g, (whole, slashes: string, bracket: string) =>
    slashes.length % 2 === 1 ? whole : `${slashes}\\${bracket}`,
  );
  return /(^|[^\\])(\\\\)*\\$/.test(escaped) ? `${escaped}\\` : escaped;
}

/** Literal text made safe as Markdown: the characters that open a link, autolink or code span are escaped. */
export function escapeText(text: string): string {
  return text.replace(/[\\[\]<>`]/g, "\\$&");
}

/** Text as an inline code span that nothing inside it can close: backticks and line ends removed. */
export function codeSpan(text: string): string {
  return `\`${text.replace(/`/g, "").replace(/[\r\n]+/g, " ")}\``;
}

/** An image as the MVP draws it (design D-14): its alt text and its path. */
export function imageText(alt: string, src: string): string {
  const label = alt.trim() === "" ? "image" : alt.trim();
  return src === "" ? `🖼 ${escapeText(label)}` : `🖼 ${escapeText(label)} ${codeSpan(src)}`;
}

const INLINE: Record<string, [string, string]> = {
  b: ["**", "**"],
  strong: ["**", "**"],
  i: ["*", "*"],
  em: ["*", "*"],
  del: ["~~", "~~"],
  s: ["~~", "~~"],
  strike: ["~~", "~~"],
  code: ["`", "`"],
  kbd: ["`", "`"],
};

const DROP_CONTENT = new Set(["script", "style", "template"]);
const TOKEN = /<!--[\s\S]*?(?:-->|$)|<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>|[^<]+|</g;

interface Table {
  rows: string[][];
  cell: string[] | null;
  header: boolean;
}

/**
 * Converts one HTML fragment to Markdown text. `inline` converts a tag on its own, as mdast hands
 * inline HTML one tag at a time; `cell` is the same inside a table cell, where a line break would
 * end the row, so `<br>` becomes a space. An anchor becomes a Markdown link only when
 * `isDrawable` passes its href; otherwise it is drawn as its label and its target as code.
 */
export function htmlToMarkdown(
  html: string,
  context: HtmlContext = "flow",
  isDrawable: (href: string) => boolean = () => false,
): string {
  const out: string[] = [];
  const lists: { ordered: boolean; n: number }[] = [];
  const tables: Table[] = [];
  let href: string | null = null;
  let drawn = false;
  let dropping: string | null = null;
  const emit = (text: string) => {
    const table = tables.at(-1);
    const target = table?.cell ?? out;
    target.push(text);
    return { target, at: target.length - 1 };
  };
  // The slot an open anchor's `[` goes in once its close shows the link may be drawn.
  let opened: { target: string[]; at: number } | null = null;
  const closeAnchor = () => {
    if (href === null) return;
    if (drawn && opened !== null) {
      opened.target[opened.at] = "[";
      emit(`](${linkDestination(href)})`);
    } else {
      emit(` (${codeSpan(href)})`);
    }
    href = null;
    opened = null;
  };
  const block = (text: string) => emit(context === "flow" ? `\n\n${text}` : text);
  for (const match of html.matchAll(TOKEN)) {
    const token = match[0];
    if (token.startsWith("<!--")) continue;
    const name = match[1]?.toLowerCase();
    if (name === undefined) {
      if (dropping === null) emit(escapeText(token === "<" ? "<" : decodeEntities(token)));
      continue;
    }
    const closing = token.startsWith("</");
    if (dropping !== null) {
      if (closing && name === dropping) dropping = null;
      continue;
    }
    if (DROP_CONTENT.has(name) && !closing) {
      if (!token.endsWith("/>")) dropping = name;
      continue;
    }
    const pair = INLINE[name];
    if (pair !== undefined) {
      emit(closing ? pair[1] : pair[0]);
      continue;
    }
    switch (name) {
      case "br":
        emit(context === "cell" ? " " : context === "inline" ? "\\\n" : "  \n");
        break;
      case "img":
        if (!closing) emit(imageText(attribute(token, "alt") ?? "", attribute(token, "src") ?? ""));
        break;
      case "a":
        if (closing) {
          closeAnchor();
        } else {
          closeAnchor();
          href = attribute(token, "href");
          drawn = href !== null && isDrawable(linkDestination(href));
          opened = href === null ? null : emit("");
        }
        break;
      case "summary":
        emit(closing ? (context === "flow" ? "**\n\n" : "** ") : context === "flow" ? "\n\n▸ **" : "▸ **");
        break;
      case "details":
      case "p":
      case "div":
      case "section":
      case "blockquote":
        if (context === "flow") emit("\n\n");
        break;
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        if (closing) emit(context === "flow" ? "\n\n" : "**");
        else block(context === "flow" ? `${"#".repeat(Number(name[1]))} ` : "**");
        break;
      case "ul":
      case "ol":
        if (!closing) {
          lists.push({ ordered: name === "ol", n: 0 });
          break;
        }
        lists.pop();
        if (lists.length === 0 && context === "flow") emit("\n\n");
        break;
      case "li": {
        if (closing) break;
        const list = lists.at(-1);
        const depth = Math.max(lists.length - 1, 0);
        const marker = list?.ordered ? `${(list.n += 1)}.` : "-";
        emit(context === "flow" ? `\n${"  ".repeat(depth)}${marker} ` : ` ${marker} `);
        break;
      }
      case "table":
        if (closing) {
          const table = tables.pop();
          if (table !== undefined) emit(tableText(table, context));
        } else {
          tables.push({ rows: [], cell: null, header: false });
        }
        break;
      case "tr": {
        const table = tables.at(-1);
        if (table !== undefined && !closing) table.rows.push([]);
        break;
      }
      case "td":
      case "th": {
        const table = tables.at(-1);
        if (table === undefined) break;
        if (closing) {
          const text = (table.cell ?? []).join("").replace(/\s+/g, " ").trim();
          table.rows.at(-1)?.push(text.replaceAll("|", "\\|"));
          table.cell = null;
        } else {
          if (table.rows.length === 0) table.rows.push([]);
          if (name === "th" && table.rows.length === 1) table.header = true;
          table.cell = [];
        }
        break;
      }
      default:
        break;
    }
  }
  drawn = false;
  closeAnchor();
  const text = out.join("");
  return context === "flow" ? text.replace(/\n{3,}/g, "\n\n").trim() : text;
}

function tableText(table: Table, context: HtmlContext): string {
  const rows = table.rows.filter((row) => row.length > 0);
  if (rows.length === 0) return "";
  const width = Math.max(...rows.map((row) => row.length));
  const line = (row: string[]) =>
    `| ${Array.from({ length: width }, (_, k) => row[k] ?? "").join(" | ")} |`;
  const [first, ...rest] = rows;
  const head = table.header && first !== undefined ? first : Array.from({ length: width }, () => "");
  const body = table.header ? rest : rows;
  const lines = [line(head), `|${" --- |".repeat(width)}`, ...body.map(line)];
  return context === "flow" ? `\n\n${lines.join("\n")}\n\n` : lines.join(" ");
}
