// xl:title 递归下降的四则运算求值器（含括号与一元负号）
// xl:round 371
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end
type Tok = { kind: "num" | "op" | "paren"; text: string };
function lex(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src.charAt(i);
    if (ch === " ") { i += 1; continue; }
    if (ch >= "0" && ch <= "9") {
      let n = "";
      while (i < src.length && src.charAt(i) >= "0" && src.charAt(i) <= "9") { n += src.charAt(i); i += 1; }
      out.push({ kind: "num", text: n });
      continue;
    }
    if (ch === "(" || ch === ")") out.push({ kind: "paren", text: ch });
    else out.push({ kind: "op", text: ch });
    i += 1;
  }
  return out;
}
class Parser {
  private at = 0;
  constructor(private toks: Tok[]) {}
  private peek(): Tok | undefined { return this.toks[this.at]; }
  parse(): number { return this.expr(); }
  private expr(): number {
    let left = this.term();
    for (;;) {
      const t = this.peek();
      if (t && t.kind === "op" && (t.text === "+" || t.text === "-")) {
        this.at += 1;
        const right = this.term();
        left = t.text === "+" ? left + right : left - right;
      } else return left;
    }
  }
  private term(): number {
    let left = this.unary();
    for (;;) {
      const t = this.peek();
      if (t && t.kind === "op" && (t.text === "*" || t.text === "/" || t.text === "%")) {
        this.at += 1;
        const right = this.unary();
        left = t.text === "*" ? left * right : t.text === "/" ? Math.trunc(left / right) : left % right;
      } else return left;
    }
  }
  private unary(): number {
    const t = this.peek();
    if (t && t.kind === "op" && t.text === "-") { this.at += 1; return -this.unary(); }
    return this.primary();
  }
  private primary(): number {
    const t = this.toks[this.at++];
    if (t.kind === "num") return Number(t.text);
    if (t.text === "(") { const v = this.expr(); this.at += 1; return v; }
    throw new Error("unexpected " + t.text);
  }
}
for (const src of ["1+2*3", "(1+2)*3", "-4 + 10", "100 / 7 % 3", "2*(3+(4-1))"]) {
  console.log(src, "=", new Parser(lex(src)).parse());
}
