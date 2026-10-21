import type { ClientKeyEvent, ClientPointerEvent, ClientSurface, RenderElement } from "claude-code";

type KeyLog = { keys: string[]; pointer: string[] };

const describeKey = (event: ClientKeyEvent): string => JSON.stringify(event);

const describePointer = (event: ClientPointerEvent): string =>
  `${event.type}@${event.x},${event.y}${event.button === undefined ? "" : `:${event.button}`}`;

/**
 * The key probe: every `onKey` and `onPointer` event the Client receives is written into its
 * own rendered text, so the screen shows what arrived.
 */
export default function KeyProbe(_props: unknown, surface: ClientSurface<KeyLog>): RenderElement {
  const { Box, Text } = surface.elements;
  const log = surface.state ?? { keys: [], pointer: [] };
  if (surface.state === undefined) {
    surface.onKey((event) => {
      const now = surface.state ?? log;
      surface.setState({ ...now, keys: [...now.keys, describeKey(event)].slice(-12) });
    });
    surface.onPointer((event) => {
      if (event.type === "move") return;
      const now = surface.state ?? log;
      surface.setState({ ...now, pointer: [...now.pointer, describePointer(event)].slice(-6) });
    });
    surface.setState(log);
  }

  return Box({
    flexDirection: "column",
    borderStyle: "single",
    children: [
      Text({ children: "KEYPROBE click here, then press Tab, a capital, /" }),
      Text({ children: `pointer: ${log.pointer.join(" ") || "(none)"}` }),
      Text({ children: `keys (${log.keys.length}):` }),
      ...log.keys.map((key, index) => Text({ key: `k${index}`, children: `  ${key}` })),
    ],
  });
}
