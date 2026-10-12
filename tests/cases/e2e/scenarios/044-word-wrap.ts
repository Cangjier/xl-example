// xl:title 文本折行：宽度 + 长单词 + 段落
// xl:round 330
// xl:judge stdout
// xl:end

function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line.length === 0) {
      line = word;
      continue;
    }
    if (line.length + 1 + word.length <= width) {
      line = line + " " + word;
      continue;
    }
    lines.push(line);
    line = word;
  }
  if (line.length > 0) lines.push(line);
  return lines;
}
const text = "the quick brown fox jumps over the lazy dog near the river bank";
const lines = wrap(text, 20);
for (const line of lines) console.log("[" + line + "]");
console.log(lines.length);
