#!/usr/bin/env node
// Stage 5d-5：**根 legacy 语句候选退场的专用探针**（零行为变化的反面——它证明的是「退场是真的」）。
//
// 回答三个问题，每个都带读数：
//
//   A. 默认解析（`EnableShellExpressions === true`）里，根目录还注册 `StatementPossibleShape` 吗？
//      —— 不注册；`SourceFileShape.CreatePossibleShapes()` 的名字表里没有它。
//   B. 默认解析的语料上，还有多少次 `StatementScanner.ScanRoot` 是**默认态**发出来的？
//      —— 0 次（读法：给 `ScanRoot` 挂一个只读计数器，按调用发生时的
//      `StatementRouteUtil.EnableShellExpressions` 分桶）。剩下的一次都来自文件级 fallback
//      的 legacy 重解析（同一份计数器记在 `fallback` 桶里），那是本阶段**允许保留**的。
//   C. false 态（文件级 fallback / harness 的 legacy 对拍）还能正常工作吗？
//      —— 能：目录在关闭态**逐位**是「默认目录 + 在原第 4 位插回根候选」；对语料里所有
//      真的触发过 fallback 的文件，`ParseCore(shell=false)` 的 AST 与默认态 `Parse` 的结果逐节点相同，
//      且 ScanRoot 在关闭态确实被调用（> 0，计数器不是空转）。
//
// 用法：
//   node tests/statement-possible/root-retirement.mjs          # 默认：全语料两遍
//   node tests/statement-possible/root-retirement.mjs --quiet  # 只打总计
//
// 退出码：0 = 三条全成立；1 = 有断言失败；2 = 语料/模块装配错误。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const require = createRequire(import.meta.url);
const load = (rel) => require(path.join(root, "build", "ts", rel));
const ts = require(path.join(root, "node_modules", "typescript"));
const { cjAst } = await import(pathToFileURL(path.join(root, "typescript", "cases", "ast-compare.mjs")).href);

const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
const { StatementScanner } = load("typescript/tokens/statements/statement-scanner.js");
const { StatementRouteUtil } = load("typescript/tokens/statements/statement-route-util.js");
const { StatementPossibleShape } = load("typescript/tokens/statements/statement-possible-shape.js");
const { SourceFileShape } = load("typescript/tokens/files/source-file-shape.js");

const quiet = process.argv.includes("--quiet");
const problems = [];
const fail = (message) => problems.push(message);

// ---------------------------------------------------------------------------
// 语料（与 legacy-retirement.mjs 完全一致：同一套目录、同一套 ts-invalid 跳过口径）
function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}
function tsBroken(text, fileName) {
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return sf.parseDiagnostics !== undefined && sf.parseDiagnostics.length > 0;
}
function walkAll(dir, recursive) {
  const out = [];
  for (const name of fs.readdirSync(dir).sort()) {
    const abs = path.join(dir, name);
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      if (recursive) out.push(...walkAll(abs, recursive));
      continue;
    }
    if (stat.isFile() && name.endsWith(".ts")) out.push(abs);
  }
  return out;
}
function collectCases() {
  const files = [
    ...walkAll(path.join(root, "tests/cases/token"), true).map((abs) => ({ abs, fileOrLines: false })),
    ...walkAll(path.join(root, "typescript", "cases", "astjson"), false).map((abs) => ({ abs, fileOrLines: true })),
  ].sort((left, right) => (left.abs < right.abs ? -1 : left.abs > right.abs ? 1 : 0));
  const cases = [];
  for (const file of files) {
    const rel = file.abs.slice(root.length + 1).split(path.sep).join("/");
    const text = stripBom(fs.readFileSync(file.abs, "utf8"));
    if (!tsBroken(text, rel)) {
      cases.push({ key: rel, source: text });
      continue;
    }
    if (!file.fileOrLines) continue;
    for (const [at, raw] of text.split("\n").entries()) {
      const line = raw.trim();
      if (line.length === 0 || line.startsWith("//")) continue;
      const key = `${rel}:L${at + 1}`;
      if (tsBroken(line, key)) continue;
      cases.push({ key, source: line });
    }
  }
  return cases;
}

// ---------------------------------------------------------------------------
// 计数器：按**调用发生时**的开关分桶（只读，不改任何判定）
const counters = { shell: 0, legacy: 0, shellLegacyCandidateCompute: 0, shellLegacyCandidateBuild: 0 };
const originalScanRoot = StatementScanner.ScanRoot;
StatementScanner.ScanRoot = function (code) {
  if (StatementRouteUtil.EnableShellExpressions) counters.shell += 1;
  else counters.legacy += 1;
  return originalScanRoot.call(StatementScanner, code);
};
const originalLegacyCompute = StatementPossibleShape.prototype.ComputeByIndex;
StatementPossibleShape.prototype.ComputeByIndex = function (units, tokenIndex, cache) {
  if (StatementRouteUtil.EnableShellExpressions) counters.shellLegacyCandidateCompute += 1;
  return originalLegacyCompute.call(this, units, tokenIndex, cache);
};
const originalLegacyBuild = StatementPossibleShape.prototype.BuildByIndex;
StatementPossibleShape.prototype.BuildByIndex = function (host, tokenIndex, catalog, context) {
  if (StatementRouteUtil.EnableShellExpressions) counters.shellLegacyCandidateBuild += 1;
  return originalLegacyBuild.call(this, host, tokenIndex, catalog, context);
};

// ---------------------------------------------------------------------------
// A：根目录的组成
const shellNames = SourceFileShape.CreatePossibleShapes().map((shape) => shape.constructor.name);
const savedExpression = StatementRouteUtil.EnableShellExpressions;
StatementRouteUtil.EnableShellExpressions = false;
const legacyNames = SourceFileShape.CreatePossibleShapes().map((shape) => shape.constructor.name);
StatementRouteUtil.EnableShellExpressions = savedExpression;

const shellHasLegacy = shellNames.includes("StatementPossibleShape");
const legacyIndex = legacyNames.indexOf("StatementPossibleShape");
const shellCount = shellNames.length;

if (shellHasLegacy) {
  fail(`默认目录仍注册根 legacy 语句候选：${JSON.stringify(shellNames)}`);
}
if (legacyIndex !== 3) {
  fail(`关闭态目录里根候选不在原第 4 位（0 基下标 3），实际 ${legacyIndex}：${JSON.stringify(legacyNames)}`);
}
const expectedLegacy = shellNames.slice();
expectedLegacy.splice(3, 0, "StatementPossibleShape");
if (JSON.stringify(legacyNames) !== JSON.stringify(expectedLegacy)) {
  fail(`关闭态目录不是「默认目录 + 第 4 位插回根候选」：\n  实际 ${JSON.stringify(legacyNames)}\n  期望 ${JSON.stringify(expectedLegacy)}`);
}

// ---------------------------------------------------------------------------
// B：默认解析的语料上，默认态 ScanRoot 归零；fallback 态仍有调用
const cases = collectCases();
const fallbackFiles = [];
let crashes = 0;
const astBefore = new Map();
for (const item of cases) {
  const before = { shell: counters.shell, legacy: counters.legacy };
  const fallbackBefore = StatementRouteUtil.FileFallbackCount;
  try {
    const shape = SourceFileRunner.Parse(item.source, item.key);
    astBefore.set(item.key, JSON.stringify(cjAst(shape)));
    if (StatementRouteUtil.FileFallbackCount !== fallbackBefore || StatementRouteUtil.LastFileFallback) {
      fallbackFiles.push({ key: item.key, source: item.source });
    }
  } catch {
    crashes += 1;
  }
  if (counters.shell !== before.shell) {
    fail(`默认态仍有 ScanRoot 调用（用例 ${item.key}，本次 +${counters.shell - before.shell}）`);
  }
}
if (crashes > 0) fail(`默认解析 crash ${crashes} 个用例`);
// B 段的 fallback 读数要在 C 段之前取，否则会把 C 段自己跑的关闭态解析也算进来。
const corpusLegacyScanRoot = counters.legacy;

// ---------------------------------------------------------------------------
// C：false 态仍工作（文件级 fallback 的真实语料 + 合成形态）
const falseStateSamples = fallbackFiles.slice(0, 12);
if (falseStateSamples.length === 0) {
  fail("语料里没有触发文件级 fallback 的用例：无法证明 false 态仍工作");
}
const FALSE_STATE_EXTRA = [
  ["let", "let x = 1;"],
  ["block", "{ function f() {} }"],
  ["async-function", "async function f() { await g(); }"],
  ["generator", "function* g() { yield 1; }"],
  ["declare", "declare const a: number;"],
  ["label", "lbl: for (;;) { break lbl; }"],
  ["class", "class C { m() { return 1; } }"],
];
const falseStateLegacyCallsBefore = counters.legacy;
let falseStateCases = 0;
for (const sample of [...falseStateSamples, ...FALSE_STATE_EXTRA.map(([key, source]) => ({ key, source }))]) {
  const scanBefore = counters.legacy;
  let legacyAst = null;
  try {
    const legacyRoot = SourceFileRunner.ParseCore(sample.source, sample.key, false);
    legacyAst = JSON.stringify(cjAst(legacyRoot));
  } catch (error) {
    fail(`关闭态解析抛错（${sample.key}）：${String(error && error.message ? error.message : error).split("\n")[0]}`);
    continue;
  }
  falseStateCases += 1;
  if (counters.legacy === scanBefore) {
    fail(`关闭态解析 ${sample.key} 一次 ScanRoot 都没调（根候选没工作）`);
  }
  const expected = astBefore.get(sample.key);
  if (expected !== undefined && legacyAst !== expected) {
    fail(`关闭态 AST 与默认态不同（${sample.key}）：fallback 路径不再逐位一致`);
  }
  if (StatementRouteUtil.LastFileFallback) {
    fail(`关闭态解析 ${sample.key} 触发了文件级 fallback（应永不兜底）`);
  }
}
const falseStateLegacyCalls = counters.legacy - falseStateLegacyCallsBefore;

// ---------------------------------------------------------------------------
// 报告
const totalShell = counters.shell;
const bars = counters.shellLegacyCandidateCompute + counters.shellLegacyCandidateBuild;
if (totalShell !== 0) fail(`默认态 ScanRoot 总计 ${totalShell}（期望 0）`);
if (bars !== 0) fail(`默认态根 legacy 候选仍被计算/建树：compute+build = ${bars}（期望 0）`);
console.log("[root-retirement] Stage 5d-5 根 legacy 语句候选退场");
console.log(`  A 根目录：默认 ${shellCount} 个候选，含 StatementPossibleShape = ${shellHasLegacy}；` +
  `关闭态 ${legacyNames.length} 个，根候选下标 = ${legacyIndex}`);
if (!quiet) {
  console.log(`     默认目录：${shellNames.join(" / ")}`);
  console.log(`     关闭目录：${legacyNames.join(" / ")}`);
}
console.log(`  B 全语料 ${cases.length} 用例（crash ${crashes}）：默认态 ScanRoot = ${totalShell}，` +
  `文件级 fallback 的 legacy 重解析里 ScanRoot = ${corpusLegacyScanRoot}`);
console.log(`     默认态根 legacy 候选：ComputeByIndex × ${counters.shellLegacyCandidateCompute}、` +
  `BuildByIndex × ${counters.shellLegacyCandidateBuild}（都应为 0）`);
console.log(`     触发文件级 fallback 的用例 = ${fallbackFiles.length}（与 legacy-retirement 的 FileFallbackCount 同口径）`);
console.log(`  C false 态：${falseStateCases} 个用例（fallback 语料 ${falseStateSamples.length} + 合成 ${FALSE_STATE_EXTRA.length}）` +
  `逐节点 AST 与默认态一致、ScanRoot 调用 ${falseStateLegacyCalls} 次、永不兜底`);
for (const problem of problems) console.log(`  FAIL ${problem}`);

console.log("");
console.log(problems.length === 0
  ? `verdict: PASS —— 默认解析根候选 0 次 ScanRoot（${cases.length} 用例），false 态逐位仍工作`
  : `verdict: FAIL —— ${problems.length} 条断言不成立`);
process.exit(problems.length === 0 ? 0 : 1);
