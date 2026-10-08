// xl:title 带变量的计算器：赋值、依赖、错误恢复
// xl:round 371
// xl:judge stdout
// xl:end
function isAlpha(s: string): boolean {
  if (s.length === 0) return false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charAt(i);
    if (c < "a" || c > "z") return false;
  }
  return true;
}
function isNumeric(s: string): boolean {
  if (s.length === 0) return false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charAt(i);
    if (!((c >= "0" && c <= "9") || c === ".")) return false;
  }
  return true;
}
function tokenize(text: string): string[] {
  const out: string[] = [];
  let cur = "";
  for (let i = 0; i < text.length; i++) {
    const c = text.charAt(i);
    if (c === " ") { if (cur !== "") { out.push(cur); cur = ""; } continue; }
    if ("+-*/()".includes(c)) { if (cur !== "") { out.push(cur); cur = ""; } out.push(c); continue; }
    cur += c;
  }
  if (cur !== "") out.push(cur);
  return out;
}
class Calc {
  private vars = new Map<string, number>();
  private history: string[] = [];
  evaluate(input: string): string {
    try {
      const eq = input.indexOf("=");
      if (eq > 0) {
        const name = input.slice(0, eq).trim();
        if (!isAlpha(name)) throw new Error("bad name: " + name);
        const value = this.expr(input.slice(eq + 1).trim());
        this.vars.set(name, value);
        this.history.push(name + "=" + value);
        return name + " = " + value;
      }
      const value = this.expr(input);
      this.history.push(String(value));
      return String(value);
    } catch (e) {
      this.history.push("!" + (e as Error).message);
      return "error: " + (e as Error).message;
    }
  }
  private expr(text: string): number {
    const tokens = tokenize(text);
    let at = 0;
    const peek = (): string | undefined => tokens[at];
    const primary = (): number => {
      const t = tokens[at++];
      if (t === "(") { const v = sum(); at += 1; return v; }
      if (t === "-") return -primary();
      if (t === undefined) throw new Error("unexpected end");
      if (isNumeric(t)) return Number(t);
      if (isAlpha(t)) {
        if (!this.vars.has(t)) throw new Error("undefined: " + t);
        return this.vars.get(t) as number;
      }
      throw new Error("bad token: " + t);
    };
    const product = (): number => {
      let left = primary();
      for (;;) {
        const t = peek();
        if (t === "*" || t === "/") { at += 1; const right = primary(); left = t === "*" ? left * right : left / right; }
        else return left;
      }
    };
    const sum = (): number => {
      let left = product();
      for (;;) {
        const t = peek();
        if (t === "+" || t === "-") { at += 1; const right = product(); left = t === "+" ? left + right : left - right; }
        else return left;
      }
    };
    return sum();
  }
  get log(): string[] { return this.history.slice(); }
}
const calc = new Calc();
for (const line of ["x = 10", "y = x * 2 + 1", "y + x", "z", "bad name = 1", "2 * (3 + 4)", "x / 0"]) {
  console.log(line, "=>", calc.evaluate(line));
}
console.log(calc.log.join(" | "));
