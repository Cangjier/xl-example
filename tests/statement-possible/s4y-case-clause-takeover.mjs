// Stage 4aa proof: switch clause-level statements are ON BY DEFAULT (both gates).
//
//   node tests/statement-possible/s4y-case-clause-takeover.mjs
//
// Root cause fixed in 4aa: the clause shell's end candidate was mounted with
// StatementKind = 0 (Wave1 variable family) so it judged with StatementScanner.ScanRoot,
// which only recognises `{` / `;` / declaration-keyword starts. The clause shell data has
// no `{` prefix, so `f`-starting clause statements were Mismatch and the shell never closed
// at `;`. It is now StatementRoute.ShellPlainExpression (`;` / EOF / ASI).
//
// Asserted here (not just printed):
//   (1) the SINGLE gate ships DEFAULT TRUE (Stage 4ae deleted BlockPossibleShape's duplicate field)
//       and EnableBlockClassShell ships TRUE (Stage 4ac promotion, re-applied on this base);
//   (2) with the gates off the raw path is byte-identical to the ON path (safe rollback);
//   (3) with the gates on: XML == off-path XML for every source, no file fallback;
//   (4) headline takeover counts: `a; b;` shell=2, `f(); case 2: g();` shell=2,
//       `f(); case 2: { g(); }` body=1.
import path from "node:path";
import { createRequire } from "node:module";
const root = process.cwd();
const require = createRequire(import.meta.url);
const load = (p) => require(path.join(root, "build/ts", p));
const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
const { StatementRouteUtil: R } = load("typescript/tokens/statements/statement-route-util.js");
const { BlockPossibleShape: B } = load("typescript/tokens/statements/block-possible-shape.js");

// shells / body are the MEASURED on-state counts; null = print only (no assertion).
const sources = [
  { source: "switch (x) { case 1: f(); }", shells: 1, body: 0 },
  { source: "switch (x) { case 1: a; b; }", shells: 2, body: 0 },
  { source: "switch (x) { case 1: f(); case 2: g(); }", shells: 2, body: 0 },
  { source: "switch (x) { case 1: f(); case 2: { g(); } }", shells: 1, body: 1 },
  { source: "switch (x) { default: f(); }", shells: 1, body: 0 },
  { source: "switch (x) { case a + 1: f(); }", shells: 1, body: 0 },
  { source: "switch (x) { case a ? b : c: f(); }", shells: 1, body: 0 },
  // Stage 4ae: a body-bearing clause statement (`if`) now closes at `}` via ScanRoot and its body
  // brace mounts the block-body catalog, so `y;` is taken over (body 0 -> 1).
  { source: "switch (x) { case 1: if (x) { y; } }", shells: 1, body: 1 },
  { source: "switch (x) { case 1: ; }", shells: 1, body: 0 },
  { source: "switch (x) { case 1: let y = 1; }", shells: 1, body: 0 },
  { source: "switch (x) { case 1: f() }", shells: 1, body: 0 },
  { source: "switch (x) { case 1: { g(); } }", shells: 0, body: 1 },
  { source: "switch (x) { case 1: f(); default: g(); }", shells: 2, body: 0 },
  { source: "switch (x) { case 1: a; b; case 2: c; }", shells: 3, body: 0 },
  { source: "switch (x) { case 1: f();\n case 2: g(); }", shells: 2, body: 0 },
  { source: "switch (x) { case 1: a\n b; }", shells: 2, body: 0 },
  { source: "switch (x) { case 1: switch (y) { case 2: f(); } }", shells: 1, body: 0 },
  { source: "switch (x) { }", shells: 0, body: 0 },
  // Stage 4ae gap ① closed: the `if` clause statement ends at its body `}` (ScanRoot), and the
  // leftover `b;` is replayed into the case-block clause catalog => two shells, no file fallback.
  { source: "switch (x) { case 1: if (x) { y; } b; }", shells: 2, body: 1 },
];

function flags(on) {
  R.EnableShellExpressions = on;
  R.EnableBlockBodyCatalog = on;
  // Stage 4ae: ONE gate. BlockPossibleShape's same-named field was deleted, so the mount site
  // asks only this one; there is no longer a way to "open one and leave the other" (fake idle).
  R.EnableSwitchCaseClause = on;
  R.EnableBlockClassShell = false;
}

let failures = 0;
function fail(message) { failures += 1; console.log("FAIL " + message); }

// 0. Shipped defaults.
if (R.EnableSwitchCaseClause !== true) fail("default EnableSwitchCaseClause is not true");
// Stage 4ae: the duplicate gate is gone. An own property here would mean a JS-side assignment
// silently creates a dead switch again (the "only one opened = fake idle" trap from 4aa).
if (Object.prototype.hasOwnProperty.call(B, "EnableSwitchCaseClause")) {
  fail("BlockPossibleShape still owns a duplicate EnableSwitchCaseClause");
}
if (R.EnableBlockClassShell !== true) fail("default EnableBlockClassShell is not true (Stage 4ae)");

for (const entry of sources) {
  const source = entry.source;
  flags(false);
  let offXml = null;
  let offThrew = null;
  try { offXml = SourceFileRunner.Parse(source, "case.ts").ToXmlString(); } catch (e) { offThrew = e; }
  if (offThrew !== null) { fail("off path threw " + source + " :: " + offThrew.message); continue; }

  flags(true);
  const before = {
    mount: R.SwitchCaseClauseMountCount, shells: R.SwitchCaseClauseShellCount,
    body: R.BlockBodyStatementCount, fallback: R.FileFallbackCount,
  };
  let shape = null, err = null;
  try { shape = SourceFileRunner.Parse(source, "case.ts"); } catch (e) { err = e; }
  if (err !== null) { fail("on path threw " + source + " :: " + err.message); continue; }
  const dm = R.SwitchCaseClauseMountCount - before.mount;
  const ds = R.SwitchCaseClauseShellCount - before.shells;
  const db = R.BlockBodyStatementCount - before.body;
  const fb = R.LastFileFallback === true || R.FileFallbackCount !== before.fallback;
  const same = shape.ToXmlString() === offXml;
  const problems = [];
  if (!same) problems.push("XML != raw path");
  if (dm !== 1) problems.push("mount " + dm + " != 1");
  if (entry.shells !== null && ds !== entry.shells) problems.push("shell " + ds + " != " + entry.shells);
  if (entry.body !== null && db !== entry.body) problems.push("body " + db + " != " + entry.body);
  if (entry.shells !== null && fb) problems.push("file fallback");
  const label = "mount=" + dm + " shell=" + ds + " body=" + db + " xml==raw=" + same + " fallback=" + fb;
  if (problems.length === 0) {
    console.log("PASS " + label + " :: " + source.replace(/\n/g, "\\n"));
  } else {
    fail(label + " [" + problems.join("; ") + "] :: " + source.replace(/\n/g, "\\n"));
  }
}

// Block-level class shell stays behind its default-off gate (Stage 4y, untouched by 4aa).
const classCases = [
  "{ class C {} }",
  "{ class C { m(){ let y = 1; } } }",
  "{ class C extends B {} }",
  "{ class C {} f(); }",
];
for (const source of classCases) {
  flags(false);
  let legacyXml = null;
  try { legacyXml = SourceFileRunner.Parse(source, "case.ts").ToXmlString(); } catch (e) { console.log("CLASS-FLAG legacy threw " + source); continue; }
  flags(true);
  R.EnableBlockClassShell = true;
  const before = { body: R.BlockBodyStatementCount, fallback: R.FileFallbackCount };
  let shape = null;
  try { shape = SourceFileRunner.Parse(source, "case.ts"); } catch (e) { console.log("CLASS-FLAG threw " + source + " :: " + e.message); R.EnableBlockClassShell = false; continue; }
  const db = R.BlockBodyStatementCount - before.body;
  const fb = R.LastFileFallback === true || R.FileFallbackCount !== before.fallback;
  console.log("CLASS-FLAG body=" + db + " xml==legacy=" + (shape.ToXmlString() === legacyXml) + " fallback=" + fb + " :: " + source);
  R.EnableBlockClassShell = false;
}

console.log(failures === 0 ? "ALL PASS" : "FAILURES " + failures);
if (failures !== 0) process.exitCode = 1;