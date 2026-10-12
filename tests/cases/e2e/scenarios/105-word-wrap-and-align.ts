// xl:title 文本折行、对齐与盒子绘制
// xl:round 371
// xl:judge stdout
// xl:end
function wrap(text: string, width: number): string[] {
  const words = text.split(" ").filter((w) => w.length > 0);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur === "") cur = w;
    else if (cur.length + 1 + w.length <= width) cur += " " + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}
function box(lines: string[], width: number): string[] {
  const top = "+" + "-".repeat(width + 2) + "+";
  const out = [top];
  for (const line of lines) out.push("| " + line.padEnd(width) + " |");
  out.push(top);
  return out;
}
const text = "the quick brown fox jumps over the lazy dog and then keeps running";
const lines = wrap(text, 20);
for (const line of box(lines, 20)) console.log(line);
console.log(lines.length, lines.map((l) => l.length).join(","));
const right = wrap("a bb ccc", 3);
console.log(JSON.stringify(right), wrap("", 5).length, wrap("word", 1).length);
