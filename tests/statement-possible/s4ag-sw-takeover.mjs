// gap-SW proof: four shapes, measured before/after, asserted (not printed).
//
//   node tests/statement-possible/s4ag-sw-takeover.mjs
//
// BEFORE (HEAD a03df655, measured with the same counters):
//   (1) `switch (x) {\n case 1: ;\n case 2: ;\n}`   scShell=1  mount=1  fallback=1  <-- file-level fallback
//   (2) `case 1: switch (y) { case 2: f(); }`      scShell=1  mount=1  (inner clause not taken over)
//   (3) `{\n class C {}\n f();\n}`                 body=0     (class shell grew to the block `}`, detached;
//                                                             `f();` never replayed into the block catalog)
//   (4) `case 1: function f() { g(); }`            fnBody=0   body=0  (function body brace never mounted)
// AFTER: (1) scShell=2 fallback=0, (2) scShell=2 mount=2, (3) body=2, (4) fnBody=1 body=1.
//
// Every case asserts: XML == legacy path (byte for byte), AST node-for-node == ts.createSourceFile,
// no file-level fallback, and the measured counter deltas.
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createAstCore, cjAst } from "../../typescript/cases/ast-compare.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const require = createRequire(import.meta.url);
const ts = require(path.join(root, "node_modules", "typescript"));
const load = (p) => require(path.join(root, "build/ts", p));
const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
const { StatementRouteUtil: R } = load("typescript/tokens/statements/statement-route-util.js");
const { BlockPossibleShape: B } = load("typescript/tokens/statements/block-possible-shape.js");
const { tsAst } = createAstCore(ts);

// shells / mount / body / fnBody are the MEASURED after-state deltas.
const cases = [
  {
    name: "empty clause x2",
    source: "switch (x) {\n case 1: ;\n case 2: ;\n}",
    shells: 2, mount: 1, body: 0, fnBody: 0,
  },
  {
    name: "empty clause then statement clause",
    source: "switch (x) { case 1: ; case 2: f(); }",
    shells: 2, mount: 1, body: 0, fnBody: 0,
  },
  {
    name: "empty clause then statement (same clause)",
    source: "switch (x) { case 1: ; f(); }",
    shells: 2, mount: 1, body: 0, fnBody: 0,
  },
  {
    name: "nested switch",
    source: "switch (x) {\n case 1: switch (y) {\n case 2: f();\n }\n}",
    shells: 2, mount: 2, body: 0, fnBody: 0,
  },
  {
    name: "nested switch, two inner clauses",
    source: "switch (x) { case 1: switch (y) { case 2: a; case 3: b; } }",
    shells: 3, mount: 2, body: 0, fnBody: 0,
  },
  {
    name: "block class then statement",
    source: "{\n class C {}\n f();\n}",
    shells: 0, mount: 0, body: 2, fnBody: 0,
  },
  {
    name: "block class then statement (same line)",
    source: "{ class C {} f(); }",
    shells: 0, mount: 0, body: 2, fnBody: 0,
  },
  {
    name: "function declaration inside a clause",
    source: "switch (x) {\n case 1: function f() { g(); }\n}",
    shells: 1, mount: 1, body: 1, fnBody: 1,
  },
  {
    name: "function declaration inside a clause, then statement",
    source: "switch (x) { case 1: function f() { g(); } b; }",
    shells: 2, mount: 1, body: 1, fnBody: 1,
  },
];

function parse(source) {
  return SourceFileRunner.Parse(source, "case.ts");
}

function flags(on) {
  R.EnableShellExpressions = on;
  R.EnableBlockBodyCatalog = on;
  R.EnableSwitchCaseClause = on;
  R.EnableBlockClassShell = on;
}

function astDiff(source, rootShape) {
  const file = ts.createSourceFile("case.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const tsNodes = file.statements.map(tsAst);
  const cjNodes = rootShape.Data.map(cjAst);
  const text = (node) => JSON.stringify(node);
  const count = Math.max(tsNodes.length, cjNodes.length);
  for (let at = 0; at < count; at++) {
    const left = at < tsNodes.length ? text(tsNodes[at]) : "<missing>";
    const right = at < cjNodes.length ? text(cjNodes[at]) : "<missing>";
    if (left !== right) {
      return `#${at}\n      TS=${left.slice(0, 300)}\n      CJ=${right.slice(0, 300)}`;
    }
  }
  return null;
}

let failures = 0;
function fail(message) {
  failures += 1;
  console.log("FAIL " + message);
}

for (const entry of cases) {
  flags(false);
  let legacyXml = null;
  try {
    legacyXml = parse(entry.source).ToXmlString();
  } catch (error) {
    fail(`${entry.name}: legacy path threw ${error.Message || error.message}`);
    continue;
  }

  flags(true);
  const before = {
    shells: R.SwitchCaseClauseShellCount,
    mount: R.SwitchCaseClauseMountCount,
    body: R.BlockBodyStatementCount,
    fnBody: B.BlockFunctionBodyMountCount,
    fallback: R.FileFallbackCount,
  };
  let shape = null;
  try {
    shape = parse(entry.source);
  } catch (error) {
    fail(`${entry.name}: on path threw ${error.Message || error.message}`);
    continue;
  }
  const after = {
    shells: R.SwitchCaseClauseShellCount - before.shells,
    mount: R.SwitchCaseClauseMountCount - before.mount,
    body: R.BlockBodyStatementCount - before.body,
    fnBody: B.BlockFunctionBodyMountCount - before.fnBody,
    fallback: R.FileFallbackCount - before.fallback,
  };
  const problems = [];
  const xml = shape.ToXmlString();
  if (xml !== legacyXml) problems.push("XML != legacy path");
  for (const tag of ["StatementShape", "PossibleShape", "CatalogGuide"]) {
    if (xml.includes(`<${tag}>`)) problems.push(`shape leak <${tag}>`);
  }
  if (R.LastFileFallback) problems.push("LastFileFallback is true");
  if (after.fallback !== 0) problems.push(`file fallback ${after.fallback} != 0`);
  for (const key of ["shells", "mount", "body", "fnBody"]) {
    if (after[key] !== entry[key]) problems.push(`${key} ${after[key]} != ${entry[key]}`);
  }
  const diff = astDiff(entry.source, shape);
  if (diff !== null) problems.push("AST != TS: " + diff);
  const label = `shells=${after.shells} mount=${after.mount} body=${after.body} fnBody=${after.fnBody}`
    + ` fallback=${after.fallback} xml==legacy=${xml === legacyXml} ast==ts=${diff === null}`;
  if (problems.length === 0) {
    console.log(`PASS ${entry.name}: ${label}`);
  } else {
    fail(`${entry.name}: ${label} [${problems.join("; ")}]`);
  }
}

console.log(failures === 0 ? `ALL PASS (${cases.length} cases)` : `FAILURES ${failures}`);
if (failures !== 0) process.exitCode = 1;
