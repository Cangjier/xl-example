// xl:title 词法分析器：数字 / 名字 / 运算符 / 空白
// xl:round 331
// xl:judge stdout
// xl:end

type Token = { kind: string; text: string };
function tokenize(source: string): Token[] {
  const out: Token[] = [];
  let at = 0;
  const isDigit = (ch: string) => ch >= "0" && ch <= "9";
  const isAlpha = (ch: string) => (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_";
  while (at < source.length) {
    const ch = source.charAt(at);
    if (ch === " ") {
      at = at + 1;
      continue;
    }
    if (isDigit(ch)) {
      let text = "";
      while (at < source.length && (isDigit(source.charAt(at)) || source.charAt(at) === ".")) {
        text = text + source.charAt(at);
        at = at + 1;
      }
      out.push({ kind: "number", text });
      continue;
    }
    if (isAlpha(ch)) {
      let text = "";
      while (at < source.length && (isAlpha(source.charAt(at)) || isDigit(source.charAt(at)))) {
        text = text + source.charAt(at);
        at = at + 1;
      }
      out.push({ kind: "name", text });
      continue;
    }
    out.push({ kind: "op", text: ch });
    at = at + 1;
  }
  return out;
}
const tokens = tokenize("let x1 = 3.5 + y_2 * 10;");
console.log(tokens.map((t) => t.kind + ":" + t.text).join("|"));
console.log(tokens.filter((t) => t.kind === "number").length);
