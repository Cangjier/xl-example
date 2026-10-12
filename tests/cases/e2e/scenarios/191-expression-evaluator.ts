// xl:title 端到端：四则运算表达式求值（分词 + 递归下降 + 错误报告）
// xl:round 7
// xl:judge stdout
// xl:args --experimental-transform-types
// xl:end

type Tok = { k: "num" | "op" | "lp" | "rp"; v: string };
function lex(s: string): Tok[] {
  const out: Tok[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === " ") continue;
    if (c >= "0" && c <= "9") { let n = c; while (i + 1 < s.length && s[i + 1] >= "0" && s[i + 1] <= "9") n += s[++i]; out.push({ k: "num", v: n }); }
    else if ("+-*/".includes(c)) out.push({ k: "op", v: c });
    else if (c === "(") out.push({ k: "lp", v: c });
    else if (c === ")") out.push({ k: "rp", v: c });
    else throw new Error("bad char " + c);
  }
  return out;
}
class Parser {
  private at = 0;
  constructor(private toks: Tok[]) {}
  private peek(): Tok | undefined { return this.toks[this.at]; }
  parse(): number { const v = this.expr(); if (this.at !== this.toks.length) throw new Error("trailing"); return v; }
  private expr(): number {
    let left = this.term();
    for (;;) {
      const t = this.peek();
      if (!t || t.k !== "op" || (t.v !== "+" && t.v !== "-")) return left;
      this.at++;
      const right = this.term();
      left = t.v === "+" ? left + right : left - right;
    }
  }
  private term(): number {
    let left = this.factor();
    for (;;) {
      const t = this.peek();
      if (!t || t.k !== "op" || (t.v !== "*" && t.v !== "/")) return left;
      this.at++;
      const right = this.factor();
      left = t.v === "*" ? left * right : left / right;
    }
  }
  private factor(): number {
    const t = this.peek();
    if (!t) throw new Error("eof");
    if (t.k === "num") { this.at++; return Number(t.v); }
    if (t.k === "lp") { this.at++; const v = this.expr(); const r = this.peek(); if (!r || r.k !== "rp") throw new Error("want )"); this.at++; return v; }
    if (t.k === "op" && t.v === "-") { this.at++; return -this.factor(); }
    throw new Error("bad token " + t.v);
  }
}
const calc = (s: string): number | string => { try { return new Parser(lex(s)).parse(); } catch (e) { return "err:" + (e as Error).message; } };
console.log(calc("1+2*3"), calc("(1+2)*3"), calc("10/4"), calc("-3+1"), calc("2*(3+(4-1))"));
console.log(calc("1+"), calc("(1"), calc("1 x"));
