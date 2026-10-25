// Stage 4y takeover proof: switch clause-level statements + the default-off block-class shell.
//
//   node tests/statement-possible/s4y-case-clause-takeover.mjs
//
// For every source it asserts: legacy XML == shell XML, no file-level fallback, and the exact
// SwitchCaseClauseMountCount / SwitchCaseClauseShellCount / BlockBodyStatementCount deltas.
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire(import.meta.url);
const load = (p) => require(path.join(root, "build/ts", p));
const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
const { StatementRouteUtil: R } = load("typescript/tokens/statements/statement-route-util.js");

// [source, mount, shells, blockBody]
const cases = [
  ["switch (x) { case 1: f(); }", 1, 1, 0],
  ["switch (x) { case 1: a; b; }", 1, 2, 0],
  ["switch (x) { case 1: f(); case 2: g(); }", 1, 2, 0],
  ["switch (x) { default: f(); }", 1, 1, 0],
  ["switch (x) { case a + 1: f(); }", 1, 1, 0],
  ["switch (x) { case a ? b : c: f(); }", 1, 1, 0],
  ["switch (x) { case 1: if (x) { y; } }", 1, 1, 1],
  ["switch (x) { case 1: ; }", 1, 1, 0],
  ["switch (x) { case 1: let y = 1; }", 1, 1, 0],
  ["switch (x) { case 1: f() }", 1, 1, 0],
  ["switch (x) { case 1: { g(); } }", 1, 0, 1],
  ["switch (x) { case 1: f(); case 2: { g(); } }", 1, 1, 1],
  ["switch (x) { case 1: f(); default: g(); }", 1, 2, 0],
  ["switch (x) { }", 1, 0, 0],
];

function xmlOf(source) {
  return SourceFileRunner.Parse(source, "case.ts").ToXmlString();
}

function setFlags(on) {
  R.EnableShellExpressions = on;
  R.EnableSwitchCaseClause = on;
  R.EnableBlockBodyCatalog = on;
  R.EnableBlockClassShell = false;
}

let failures = 0;
function fail(message) {
  failures += 1;
  console.log(`FAIL ${message}`);
}

for (const [source, mount, shells, body] of cases) {
  setFlags(false);
  let legacyXml = null;
  try {
    legacyXml = xmlOf(source);
  } catch (error) {
    fail(`legacy threw ${source}: ${error && error.message}`);
    continue;
  }
  setFlags(true);
  const before = {
    mount: R.SwitchCaseClauseMountCount,
    shells: R.SwitchCaseClauseShellCount,
    body: R.BlockBodyStatementCount,
    fallback: R.FileFallbackCount,
  };
  let shape = null;
  try {
    shape = SourceFileRunner.Parse(source, "case.ts");
  } catch (error) {
    fail(`taken-over path threw ${source}: ${error && error.message}`);
    continue;
  }
  const dm = R.SwitchCaseClauseMountCount - before.mount;
  const ds = R.SwitchCaseClauseShellCount - before.shells;
  const db = R.BlockBodyStatementCount - before.body;
  const problems = [];
  if (dm !== mount) problems.push(`mount ${dm} != ${mount}`);
  if (ds !== shells) problems.push(`shells ${ds} != ${shells}`);
  if (db !== body) problems.push(`body ${db} != ${body}`);
  if (R.LastFileFallback === true || R.FileFallbackCount !== before.fallback) problems.push("file fallback");
  if (shape.ToXmlString() !== legacyXml) problems.push("XML != legacy");
  if (problems.length === 0) {
    console.log(`OK   ${source}  mount=${dm} shell=${ds} body=${db}`);
  } else {
    fail(`${source}  ${problems.join("; ")}`);
  }
}

// Block-level class shell is a DEFAULT-OFF candidate path: prove it with the flag on, if it holds.
const classCases = [
  "{ class C {} }",
  "{ class C { m(){ let y = 1; } } }",
  "{ class C extends B {} }",
  "{ class C {} f(); }",
];
for (const source of classCases) {
  R.EnableShellExpressions = false;
  R.EnableBlockClassShell = false;
  let legacyXml = null;
  try {
    legacyXml = xmlOf(source);
  } catch (error) {
    console.log(`SKIP class (legacy threw) ${source}: ${error && error.message}`);
    continue;
  }
  R.EnableShellExpressions = true;
  R.EnableBlockBodyCatalog = true;
  R.EnableSwitchCaseClause = true;
  R.EnableBlockClassShell = true;
  const before = { body: R.BlockBodyStatementCount, fallback: R.FileFallbackCount };
  let shape = null;
  try {
    shape = SourceFileRunner.Parse(source, "case.ts");
  } catch (error) {
    console.log(`CLASS-FLAG-NOK (threw) ${source}: ${error && error.message}`);
    R.EnableBlockClassShell = false;
    continue;
  }
  const db = R.BlockBodyStatementCount - before.body;
  const xmlOk = shape.ToXmlString() === legacyXml;
  const fb = R.LastFileFallback === true || R.FileFallbackCount !== before.fallback;
  console.log(`CLASS-FLAG body=${db} xml==legacy=${xmlOk} fallback=${fb} ${source}`);
  R.EnableBlockClassShell = false;
}

console.log(failures === 0 ? "ALL PASS" : `FAILURES ${failures}`);
if (failures !== 0) process.exitCode = 1;