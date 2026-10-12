// xl:title 表达式 AST：求值、打印、变量收集
// xl:round 371
// xl:judge stdout
// xl:end
type Expr =
  | { kind: "num"; value: number }
  | { kind: "var"; name: string }
  | { kind: "bin"; op: string; left: Expr; right: Expr }
  | { kind: "call"; callee: string; args: Expr[] };
const ast: Expr = {
  kind: "bin",
  op: "+",
  left: { kind: "call", callee: "max", args: [{ kind: "num", value: 3 }, { kind: "var", name: "x" }] },
  right: { kind: "bin", op: "*", left: { kind: "num", value: 2 }, right: { kind: "var", name: "y" } },
};
const funcs: Record<string, (...args: number[]) => number> = {
  max: (...ns) => Math.max(...ns),
  min: (...ns) => Math.min(...ns),
};
function evaluate(e: Expr, env: Record<string, number>): number {
  switch (e.kind) {
    case "num": return e.value;
    case "var": {
      if (!(e.name in env)) throw new Error("undefined variable: " + e.name);
      return env[e.name];
    }
    case "bin": {
      const l = evaluate(e.left, env);
      const r = evaluate(e.right, env);
      if (e.op === "+") return l + r;
      if (e.op === "-") return l - r;
      if (e.op === "*") return l * r;
      return Math.trunc(l / r);
    }
    case "call": {
      const fn = funcs[e.callee];
      if (!fn) throw new Error("unknown function: " + e.callee);
      return fn(...e.args.map((a) => evaluate(a, env)));
    }
  }
}
function print(e: Expr): string {
  switch (e.kind) {
    case "num": return String(e.value);
    case "var": return e.name;
    case "bin": return "(" + print(e.left) + " " + e.op + " " + print(e.right) + ")";
    case "call": return e.callee + "(" + e.args.map(print).join(", ") + ")";
  }
}
function collectVars(e: Expr, out: Set<string> = new Set()): Set<string> {
  if (e.kind === "var") out.add(e.name);
  else if (e.kind === "bin") { collectVars(e.left, out); collectVars(e.right, out); }
  else if (e.kind === "call") for (const a of e.args) collectVars(a, out);
  return out;
}
console.log(print(ast));
console.log(evaluate(ast, { x: 5, y: 4 }));
console.log([...collectVars(ast)].sort().join(","));
try { evaluate(ast, { x: 1 }); } catch (e) { console.log((e as Error).message); }
console.log(collectVars({ kind: "num", value: 1 }).size);
