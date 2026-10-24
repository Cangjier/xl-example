// R1 root-cause probe: AST verdicts vs ts.createSourceFile, boundary decision trace,
// and a counterfactual that shows the naive boundary fix is unsafe. Diagnostic only.
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAstCore, cjAst } from "../../typescript/cases/ast-compare.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const require = createRequire(import.meta.url);
const ts = require(path.join(root, "node_modules", "typescript"));
const { tsAst } = createAstCore(ts);
const load = (r) => require(path.join(root, "build/ts", r));

const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
const { StatementScanner } = load("typescript/tokens/statements/statement-scanner.js");
const { StatementBoundaryUtil } = load("typescript/tokens/statements/statement-boundary-util.js");
const { ExpressionStatementPossibleShape } = load("typescript/tokens/statements/expression-statement-possible-shape.js");
const { Bracket } = load("core/syntax/basic-tokens/bracket.js");
let route = null;
try { route = load("typescript/tokens/statements/statement-route-util.js").StatementRouteUtil; } catch (e) { route = null; }

const FORMS = [
  ["R1-bare-block           ", "let a = 1\n{ b; }"],
  ["let-empty-block         ", "let a = 1\n{}"],
  ["assign-empty-block      ", "x = 1\n{}"],
  ["if-block-sameline       ", "let a = 1\nif (a) {}"],
  ["expr-then-block         ", "a\n{}"],
  ["let-decl-block          ", "let a = 1\n{ let b = 2; }"],
  ["let-empty-stmt-block    ", "let a = 1\n;\n{ b; }"],
  ["ctrl-semicolon          ", "let a = 1;\n{ b; }"],
  ["ctrl-function-expr      ", "const f = function ()\n{ }"],
  ["ctrl-arrow-block        ", "const f = () =>\n{ }"],
  ["ctrl-block-first        ", "{ b; }\nlet a = 1"],
  ["ctrl-type-literal       ", "let a: {\n  x: number\n} = { x: 1 }"],
];

function msgOf(error) {
  let m = "";
  for (let n = error; n; n = n.InnerException || n.innerException) {
    const t = n.Message || n.message;
    if (t) m = String(t);
  }
  return m.split("\n")[0] || "unknown";
}
function kindsOf(node) { return JSON.stringify((node.children || []).map((c) => c.kind)); }
function verdict(source) {
  if (route !== null) route.EnableShellExpressions = true;
  try {
    const shape = SourceFileRunner.Parse(source, "case.ts");
    const tsNodes = tsAst(ts.createSourceFile("case.ts", source, ts.ScriptTarget.Latest, true));
    const cjNodes = cjAst(shape);
    // The file shape's Data stops at the last real token, ts keeps a trailing EndOfFileToken:
    // that token is the only tolerated delta (same convention as typescript/cases/ast-json.mjs).
    const strip = (node) => { const kids = node.children || []; if (kids.length > 0 && kids[kids.length - 1].kind === "EndOfFileToken") kids.pop(); return node; };
    strip(tsNodes);
    if (JSON.stringify(cjNodes) === JSON.stringify(tsNodes)) return "MATCH";
    return "DIFF cj=" + kindsOf(cjNodes) + " ts=" + kindsOf(tsNodes);
  } catch (error) {
    return "THROW " + msgOf(error);
  }
}

const CAP = 40;
let LOG = [];
function tag(unit, source) {
  if (unit === undefined || unit === null) return "<none>";
  const r = unit.SourceRange || {};
  const s = r.StartIndex, e = r.EndIndex;
  if (typeof s === "number" && typeof e === "number" && s >= 0 && e >= s && e <= source.length) {
    return JSON.stringify(source.slice(s, e));
  }
  return "?" + unit.constructor.name;
}
function installTrace(source) {
  const origEnds = StatementBoundaryUtil.EndsAtLineBreak;
  const origTail = ExpressionStatementPossibleShape.IsUncontinuableTailBoundary;
  const origScan = StatementScanner.ScanToSemicolon;
  StatementBoundaryUtil.EndsAtLineBreak = function (code, p, n) {
    const r = origEnds.call(StatementBoundaryUtil, code, p, n);
    if (LOG.length < CAP) LOG.push("EndsAtLineBreak(prev=" + tag(code[p], source) + " @" + p + ", next=" + tag(code[n], source) + " @" + n + ") -> " + r);
    return r;
  };
  ExpressionStatementPossibleShape.IsUncontinuableTailBoundary = function (code, at) {
    const r = origTail.call(ExpressionStatementPossibleShape, code, at);
    if (LOG.length < CAP) LOG.push("IsUncontinuableTailBoundary(@" + at + " " + tag(code[at], source) + ") -> " + r);
    return r;
  };
  StatementScanner.ScanToSemicolon = function (code, from, stopAtEof) {
    const r = origScan.call(StatementScanner, code, from, stopAtEof);
    if (LOG.length < CAP) LOG.push("ScanToSemicolon(from=" + from + ", stopAtEof=" + stopAtEof + ") -> status=" + r.Status + " end=" + r.End);
    return r;
  };
  return () => {
    StatementBoundaryUtil.EndsAtLineBreak = origEnds;
    ExpressionStatementPossibleShape.IsUncontinuableTailBoundary = origTail;
    StatementScanner.ScanToSemicolon = origScan;
  };
}

function naiveVerdicts() {
  const origEnds = StatementBoundaryUtil.EndsAtLineBreak;
  StatementBoundaryUtil.EndsAtLineBreak = function (code, p, n) {
    const next = code[n];
    if (next instanceof Bracket && next.StartBracketChar === "{") return true;
    return origEnds.call(StatementBoundaryUtil, code, p, n);
  };
  let rows;
  try {
    rows = FORMS.map((f) => f[0] + " " + verdict(f[1]));
  } finally {
    StatementBoundaryUtil.EndsAtLineBreak = origEnds;
  }
  return rows;
}

console.log("== baseline verdicts: CJ AST vs ts.createSourceFile (shell=true) ==");
for (const f of FORMS) console.log(f[0] + " " + verdict(f[1]));

console.log("");
console.log("== decision trace ==");
for (const src of ["let a = 1\n{ b; }", "const f = function ()\n{ }"]) {
  LOG = [];
  const restore = installTrace(src);
  let text;
  try { text = verdict(src); } finally { restore(); }
  console.log("source " + JSON.stringify(src) + " => " + text);
  for (const line of LOG) console.log("    " + line);
}

console.log("");
console.log("== counterfactual: EndsAtLineBreak -> true whenever next unit is '{' ==");
for (const row of naiveVerdicts()) console.log(row);