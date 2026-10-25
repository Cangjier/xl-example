// Stage 4y proof: switch clause-level statements (SAFE ROLLBACK state) + the default-off block-class shell.
//
//   node tests/statement-possible/s4y-case-clause-takeover.mjs
//
// Shipped default: `EnableSwitchCaseClause = false` (see HANDOFF-s4y.md §1: the clause shell does not close
// at `;`, so the takeover is incomplete and would swallow the following case-body mounts). This script
// therefore asserts the SAFE state for every source:
//   (1) SwitchCaseClauseMountCount / SwitchCaseClauseShellCount deltas are 0;
//   (2) shell-path XML == legacy-path XML byte for byte;
//   (3) no file-level fallback.
// It then re-runs each source with the flag FORCED ON and prints the measured numbers as diagnostics
// (never as a pass/fail): those are the recorded gap readings, not a delivered feature.
//
// The block-class gate (`EnableBlockClassShell`, also default off) is measured the same way: forced on,
// then XML == legacy + fallback + BlockBodyStatementCount are printed.
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire(import.meta.url);
const load = (p) => require(path.join(root, "build/ts", p));
const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
const { StatementRouteUtil: R } = load("typescript/tokens/statements/statement-route-util.js");

const sources = [
  "switch (x) { case 1: f(); }",
  "switch (x) { case 1: a; b; }",
  "switch (x) { case 1: f(); case 2: g(); }",
  "switch (x) { default: f(); }",
  "switch (x) { case a + 1: f(); }",
  "switch (x) { case a ? b : c: f(); }",
  "switch (x) { case 1: if (x) { y; } }",
  "switch (x) { case 1: ; }",
  "switch (x) { case 1: let y = 1; }",
  "switch (x) { case 1: f() }",
  "switch (x) { case 1: { g(); } }",
  "switch (x) { case 1: f(); case 2: { g(); } }",
  "switch (x) { case 1: f(); default: g(); }",
  "switch (x) { }",
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

// 0. Shipped defaults are the safe rollback for both gates.
if (R.EnableSwitchCaseClause !== false) {
  fail("默认 EnableSwitchCaseClause 不是 false（安全回退被破坏）");
}
if (R.EnableBlockClassShell !== false) {
  fail("默认 EnableBlockClassShell 不是 false（安全回退被破坏）");
}

for (const source of sources) {
  setFlags(false);
  let legacyXml = null;
  try {
    legacyXml = xmlOf(source);
  } catch (error) {
    fail(`legacy threw ${source}: ${error && error.message}`);
    continue;
  }

  // 1. Shipped (default) path: no clause catalog, raw legacy tree, zero fallback.
  setFlags(true);
  R.EnableSwitchCaseClause = false;
  const before = {
    mount: R.SwitchCaseClauseMountCount,
    shells: R.SwitchCaseClauseShellCount,
    fallback: R.FileFallbackCount,
  };
  let shape = null;
  try {
    shape = SourceFileRunner.Parse(source, "case.ts");
  } catch (error) {
    fail(`default path threw ${source}: ${error && error.message}`);
    continue;
  }
  const problems = [];
  const dm = R.SwitchCaseClauseMountCount - before.mount;
  const ds = R.SwitchCaseClauseShellCount - before.shells;
  if (dm !== 0) problems.push(`mount ${dm} != 0`);
  if (ds !== 0) problems.push(`shells ${ds} != 0`);
  if (R.LastFileFallback === true || R.FileFallbackCount !== before.fallback) problems.push("file fallback");
  if (shape.ToXmlString() !== legacyXml) problems.push("XML != legacy");
  if (problems.length === 0) {
    console.log(`OK   ${source}  default: mount=0 shell=0 xml==legacy`);
  } else {
    fail(`${source}  ${problems.join("; ")}`);
  }

  // 2. Forced-on diagnostics (the recorded gap; not asserted).
  R.EnableSwitchCaseClause = true;
  const onBefore = { mount: R.SwitchCaseClauseMountCount, shells: R.SwitchCaseClauseShellCount, body: R.BlockBodyStatementCount, fallback: R.FileFallbackCount };
  let onShape = null;
  try {
    onShape = SourceFileRunner.Parse(source, "case.ts");
  } catch (error) {
    console.log(`ON-STATE (threw) ${source}: ${error && error.message}`);
    R.EnableSwitchCaseClause = false;
    continue;
  }
  const om = R.SwitchCaseClauseMountCount - onBefore.mount;
  const os = R.SwitchCaseClauseShellCount - onBefore.shells;
  const ob = R.BlockBodyStatementCount - onBefore.body;
  const ofb = R.LastFileFallback === true || R.FileFallbackCount !== onBefore.fallback;
  console.log(`ON-STATE mount=${om} shell=${os} body=${ob} xml==legacy=${onShape.ToXmlString() === legacyXml} fallback=${ofb} :: ${source}`);
  R.EnableSwitchCaseClause = false;
}

// 3. Block-level class shell (default off): forced-on diagnostics.
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
    console.log(`CLASS-FLAG (legacy threw) ${source}: ${error && error.message}`);
    continue;
  }
  R.EnableShellExpressions = true;
  R.EnableBlockBodyCatalog = true;
  R.EnableBlockClassShell = true;
  const before = { body: R.BlockBodyStatementCount, fallback: R.FileFallbackCount };
  let shape = null;
  try {
    shape = SourceFileRunner.Parse(source, "case.ts");
  } catch (error) {
    console.log(`CLASS-FLAG (threw) ${source}: ${error && error.message}`);
    R.EnableBlockClassShell = false;
    continue;
  }
  const db = R.BlockBodyStatementCount - before.body;
  const fb = R.LastFileFallback === true || R.FileFallbackCount !== before.fallback;
  console.log(`CLASS-FLAG body=${db} xml==legacy=${shape.ToXmlString() === legacyXml} fallback=${fb} :: ${source}`);
  R.EnableBlockClassShell = false;
}

console.log(failures === 0 ? "ALL PASS (safe rollback state)" : `FAILURES ${failures}`);
if (failures !== 0) process.exitCode = 1;
