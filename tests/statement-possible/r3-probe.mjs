// R3 probe: verdict + first structural difference for the remaining R2 gaps.
//   node tests/statement-possible/r3-probe.mjs
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
let route = null;
try { route = load("typescript/tokens/statements/statement-route-util.js").StatementRouteUtil; } catch (e) { route = null; }

const FORMS = [
  ["if-body-block      ", "if (a) b\n{}"],
  ["if-body-block-stmt ", "if (a) b\n{ c; }"],
  ["if-body-semicolon   ", "if (a) b;\n{}"],
  ["if-block-else       ", "if (a) {}\nelse {}"],
  ["if-single-body      ", "if (a) b"],
  ["if-block-sameline   ", "if (a) b {}"],
  ["object-then-block   ", "const o = { a: 1 }\n{ b: 2 }"],
  ["object-then-block2  ", "o = { a: 1 }\n{ }"],
  ["export-decl-block   ", "export let a=1\n{}"],
  ["export-decl-block2  ", "export const a=1\n{ b; }"],
  ["assign-block        ", "x = 1\n{}"],
  ["assign-block-stmt   ", "x = 1\n{ y; }"],
  ["let-bare-block      ", "let a = 1\n{ b; }"],
  ["while-body-block    ", "while (a) b\n{}"],
  ["for-body-block      ", "for (;;) b\n{}"],
  ["label-body-block    ", "lbl: b\n{}"],
  ["do-body-block       ", "do b\n{} while (a);"],
  ["if-fn-expr-body     ", "if (a) function f ()\n{ }"],
  ["if-class-body       ", "if (a) class A\n{ }"],
  ["fn-expr-ctrl        ", "const f = function ()\n{ }"],
  ["arrow-block-ctrl    ", "const f = () =>\n{ }"],
  ["type-literal-ctrl   ", "let a: {\n  x: number\n} = { x: 1 }"],
  ["block-then-let      ", "{ b; }\nlet a = 1"],
  ["bare-block-only     ", "{}"],
  ["expr-then-block     ", "a\n{}"],
  ["return-object-block ", "function f() { return { a: 1 }\n{ b; } }"],
  ["arrow-expr-block    ", "const g = () => 1\n{ }"],
  ["plain-expr-semicolon", "x = 1;"],
];

function msgOf(error) {
  let m = "";
  for (let n = error; n; n = n.InnerException || n.innerException) {
    const t = n.Message || n.message;
    if (t) m = String(t);
  }
  return m.split("\n")[0] || "unknown";
}
const strip = (node) => { const kids = node.children || []; if (kids.length && kids[kids.length - 1].kind === "EndOfFileToken") kids.pop(); return node; };
const flat = (node, out = [], depth = 0) => {
  out.push({ depth, kind: node.kind, pos: node.pos, end: node.end, text: node.text });
  for (const c of node.children || []) flat(c, out, depth + 1);
  return out;
};
function firstDiff(cj, tst) {
  const a = flat(cj), b = flat(tst);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i], y = b[i];
    if (!x || !y) return `len cj=${a.length} ts=${b.length} at#${i}`;
    for (const k of ["kind", "pos", "end", "text"]) {
      if (x[k] !== y[k]) return `#${i} depth=${x.depth} ${k}: cj=${JSON.stringify(x[k])} ts=${JSON.stringify(y[k])} kind=${x.kind}`;
    }
  }
  return null;
}
let fails = 0;
for (const [label, source] of FORMS) {
  if (route !== null) route.EnableShellExpressions = true;
  let text;
  try {
    const cj = cjAst(SourceFileRunner.Parse(source, "case.ts"));
    const tst = strip(tsAst(ts.createSourceFile("case.ts", source, ts.ScriptTarget.Latest, true)));
    const diff = firstDiff(cj, tst);
    text = diff === null ? "MATCH" : "DIFF " + diff;
    if (diff !== null) fails++;
  } catch (error) {
    text = "THROW " + msgOf(error);
    fails++;
  }
  console.log(label + " " + JSON.stringify(source).padEnd(34) + " => " + text);
}
console.log(`\nfailing forms: ${fails}/${FORMS.length}`);
