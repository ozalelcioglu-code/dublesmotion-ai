export type ScriptEntry =
  | { type: "dialogue"; speaker: string; text: string }
  | { type: "direction"; text: string };

export type ScriptScene = { title: string; entries: ScriptEntry[] };

export type ParsedScript = { introduction: string[]; notes: string[]; scenes: ScriptScene[] };

export function parseScript(input: string): ParsedScript {
  const result: ParsedScript = { introduction: [], notes: [], scenes: [] };
  let scene: ScriptScene | undefined;
  for (const raw of input.replace(/\r\n?/g, "\n").split("\n")) {
    const heading = raw.trim().match(/^#{1,6}\s+(.+)$/);
    const line = (heading?.[1] ?? raw).replace(/\*\*/g, "").trim();
    if (!line) continue;
    if (/^(?:sahne|scene)\s+\d+\b/i.test(line)) {
      scene = { title: line, entries: [] };
      result.scenes.push(scene);
      continue;
    }
    if (heading && result.scenes.length > 0) scene = undefined;
    if (!scene) {
      const section = result.scenes.length > 0 ? result.notes : result.introduction;
      section.push(line);
      continue;
    }
    const dialogue = line.match(/^([\p{L}][\p{L}\p{M}\p{N} .’'()-]{0,59})[:：]\s*(.+)$/u);
    if (dialogue) {
      scene.entries.push({ type: "dialogue", speaker: dialogue[1].trim(), text: dialogue[2].trim() });
    } else {
      scene.entries.push({ type: "direction", text: line.replace(/^\*(.+)\*$/, "$1") });
    }
  }
  return result;
}

// A planning estimate at 135 words per minute, not a measured recording.
export function estimateSpeechSeconds(text: string) {
  const words = text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  return Math.ceil(words * 60 / 135);
}
