// xl:title 端到端：字符级分词 + 分类统计 + 还原校验
// xl:round 7
// xl:judge stdout
// xl:end

type Kind = "word" | "num" | "sym" | "space";
type Piece = { kind: Kind; text: string; at: number };
function classify(ch: string): Kind {
  if (ch >= "0" && ch <= "9") return "num";
  if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_") return "word";
  if (ch === " " || ch === "\t" || ch === "\n") return "space";
  return "sym";
}
function tokenize(text: string): Piece[] {
  const out: Piece[] = [];
  let at = 0;
  while (at < text.length) {
    const kind = classify(text[at]);
    let end = at + 1;
    while (end < text.length && classify(text[end]) === kind) end++;
    out.push({ kind, text: text.slice(at, end), at });
    at = end;
  }
  return out;
}
const source = "let x2 = 10 + y;";
const pieces = tokenize(source);
console.log(pieces.map((p) => p.kind + "(" + p.text + ")").join(" "));
console.log(pieces.map((p) => p.text).join("") === source);
const counts = new Map<Kind, number>();
for (const p of pieces) counts.set(p.kind, (counts.get(p.kind) ?? 0) + 1);
console.log([...counts.entries()].map(([k, v]) => k + "=" + v).join(","));
console.log(pieces.filter((p) => p.kind === "word").map((p) => p.at).join(","));
