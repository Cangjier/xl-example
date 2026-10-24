const path = require("path");
const { createRequire } = require("module");
const require2 = createRequire(path.join(process.cwd(), "tests/statement-possible/x.mjs"));
const root = process.cwd();
const ts = require2(path.join(root, "node_modules/typescript"));
const { createAstCore, cjAst } = require2(path.join(root, "typescript/cases/ast-compare.mjs"));
const { tsAst } = createAstCore(ts);
const load = (r) => require2(path.join(root, "build/ts", r));
const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
const { ExpressionStatementPossibleShape } = load("typescript/tokens/statements/expression-statement-possible-shape.js");
let route = null; try { route = load("typescript/tokens/statements/statement-route-util.js").StatementRouteUtil; } catch (e) {}
if (route) route.EnableShellExpressions = true;
const strip = (n) => { const k = n.children || []; if (k.length && k[k.length - 1].kind === "EndOfFileToken") k.pop(); return n; };
function verdict(source) {
  try {
    const cj = cjAst(SourceFileRunner.Parse(source, "case.ts"));
    const t = strip(tsAst(ts.createSourceFile("case.ts", source, ts.ScriptTarget.Latest, true)));
    return JSON.stringify(cj) === JSON.stringify(t) ? "MATCH" : "DIFF";
  } catch (e) { return "THROW " + String(e && e.Message || e.message || e).split("\n")[0]; }
}
const doc = JSON.parse(require2("fs").readFileSync("tests/statement-possible/r1-cases.json", "utf8"));
const included = doc.groups["r1-asi"].cases.map((c) => [c.name, c.source, "included"]);
const excluded = [
  ["r1-if-body-block", "if (a) b\n{}", "excluded"],
  ["r1-object-then-block", "const o = { a: 1 }\n{ b: 2 }", "excluded"],
  ["r1-assign-block", "x = 1\n{}", "excluded"],
  ["r1-arrow-expr-then-block", "const g = () => 1\n{ }", "excluded"],
  ["r1-export-decl", "export let a=1\n{}", "excluded"],
];
const all = included.concat(excluded);
const orig = ExpressionStatementPossibleShape.ExpectsBodyBefore;
console.log("name".padEnd(26) + "WITH-FIX        WITHOUT-FIX(neutralized)   set");
for (const [n, s, set] of all) {
  ExpressionStatementPossibleShape.ExpectsBodyBefore = orig;
  const withFix = verdict(s);
  ExpressionStatementPossibleShape.ExpectsBodyBefore = () => true;   // new branch never fires == pre-fix behaviour
  const withoutFix = verdict(s);
  ExpressionStatementPossibleShape.ExpectsBodyBefore = orig;
  console.log(n.padEnd(26) + withFix.padEnd(16) + withoutFix.padEnd(27) + set);
}