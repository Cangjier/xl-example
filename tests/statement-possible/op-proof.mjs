#!/usr/bin/env node
// S3a+S3b 结构取证（专用 instruments，不属于旧门）。
//
// 对 tests/statement-possible/op-cases.json 里 operators-live 组的每一条，断言四件事：
//   1. 壳路径 XML == 同源码 legacy 路径（EnableShellExpressions=false）XML，逐字节；
//   2. 壳路径没有触发文件级 fallback（StatementRouteUtil.LastFileFallback === false）；
//   3. StatementOperatorBody.ShapeTexts 与期望的结构文本逐字一致（+(*(1,2),3) 这类前缀写法）；
//   4. 增量插入确实发生：InsertBetween 计数 >= minInserts；未覆盖构造必须判 incomplete 而不是建错树。
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const buildRoot = path.join(root, "build", "ts");
const require = createRequire(import.meta.url);
const load = (rel) => require(path.join(buildRoot, rel));

const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
const { StatementRouteUtil } = load("typescript/tokens/statements/statement-route-util.js");
const { StatementOperatorBody } = load("typescript/tokens/statements/statement-operator-body.js");

const argOf = (name, fallback) => {
  const hit = process.argv.find((item) => item.startsWith(`--${name}=`));
  return hit === undefined ? fallback : hit.slice(name.length + 3);
};

const file = path.resolve(root, argOf("file", path.join("tests", "statement-possible", "op-cases.json")));
const groupName = argOf("group", "operators-live");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const group = data.groups[groupName];
if (group === undefined) {
  console.log(`FAIL  用例文件 ${file} 里没有分组 ${groupName}`);
  process.exit(1);
}

function astLineOf(shape) {
  if (shape === null || shape === undefined || typeof shape.ToAstLine !== "function") return null;
  return shape.ToAstLine(0);
}

function firstDiff(left, right) {
  if (left === right) return null;
  const limit = Math.min(left.length, right.length);
  for (let at = 0; at < limit; at++) {
    if (left[at] !== right[at]) {
      return `首个不同在第 ${at} 字节：壳=${JSON.stringify(left.slice(Math.max(0, at - 30), at + 30))} legacy=${JSON.stringify(right.slice(Math.max(0, at - 30), at + 30))}`;
    }
  }
  return `长度不同：壳=${left.length} legacy=${right.length}`;
}

function reset() {
  StatementOperatorBody.ShapeTexts.length = 0;
  StatementOperatorBody.TotalBodies = 0;
  StatementOperatorBody.TotalInserts = 0;
  StatementOperatorBody.TotalIncomplete = 0;
  StatementOperatorBody.LastText = "";
  StatementOperatorBody.LastComplete = false;
}

function runShell(source) {
  reset();
  StatementRouteUtil.EnableShellExpressions = true;
  const shape = SourceFileRunner.Parse(source, "case.ts");
  const collected = {
    xml: astLineOf(shape),
    fallback: StatementRouteUtil.LastFileFallback === true,
    texts: StatementOperatorBody.ShapeTexts.slice(),
    inserts: StatementOperatorBody.TotalInserts,
    incomplete: StatementOperatorBody.TotalIncomplete > 0,
    bodies: StatementOperatorBody.TotalBodies,
  };
  return collected;
}

function runLegacy(source) {
  const previous = StatementRouteUtil.EnableShellExpressions;
  reset();
  try {
    StatementRouteUtil.EnableShellExpressions = false;
    return astLineOf(SourceFileRunner.Parse(source, "case.ts"));
  } finally {
    StatementRouteUtil.EnableShellExpressions = previous;
  }
}

const cases = group.cases || [];
const failures = [];
let passed = 0;
let checkedInserts = 0;
let checkedTexts = 0;

for (const caseDef of cases) {
  const expect = caseDef.operatorShapes || {};
  const problems = [];
  let shell = null;
  try {
    shell = runShell(caseDef.source);
  } catch (error) {
    problems.push(`壳路径 Parse 抛错：${String(error && error.message ? error.message : error).split("\n")[0]}`);
  }
  if (shell !== null) {
    let legacyAstLine = null;
    try {
      legacyAstLine = runLegacy(caseDef.source);
    } catch (error) {
      problems.push(`legacy 路径 Parse 抛错：${String(error && error.message ? error.message : error).split("\n")[0]}`);
    }
    if (shell.fallback) problems.push("壳路径触发了文件级 fallback（本组要求不 fallback）");
    if (legacyAstLine !== null && shell.xml !== null) {
      const diff = firstDiff(shell.xml, legacyAstLine);
      if (diff !== null) problems.push(`壳 XML != legacy XML：${diff}`);
    }
    if (legacyAstLine === null) problems.push("legacy 路径没有产出 XML");
    if (shell.xml !== null) {
      for (const tag of ["StatementShape", "StatementOperandShape", "StatementOperatorBody"]) {
        if (shell.xml.includes(`${tag}  `)) problems.push(`形状泄漏进 XML：<${tag}>`);
      }
    }
    const wantTexts = expect.texts;
    if (Array.isArray(wantTexts)) {
      checkedTexts++;
      if (JSON.stringify(shell.texts) !== JSON.stringify(wantTexts)) {
        problems.push(`结构文本不符：期望 ${JSON.stringify(wantTexts)} 实际 ${JSON.stringify(shell.texts)}`);
      }
    }
    if (typeof expect.minInserts === "number") {
      checkedInserts++;
      if (shell.inserts < expect.minInserts) {
        problems.push(`InsertBetween 次数不足：期望 >= ${expect.minInserts} 实际 ${shell.inserts}`);
      }
    }
    if (typeof expect.bodies === "number" && shell.bodies !== expect.bodies) {
      problems.push(`表达式体个数不符：期望 ${expect.bodies} 实际 ${shell.bodies}`);
    }
    if (expect.incomplete === true && !shell.incomplete) {
      problems.push("期望判 incomplete（未覆盖构造）实际未判");
    }
    if (expect.incomplete === false && shell.incomplete) {
      problems.push("不期望判 incomplete 实际判了");
    }
  }
  if (problems.length === 0) {
    passed++;
    console.log(`PASS  ${caseDef.name}  texts=${JSON.stringify(shell === null ? [] : shell.texts)} inserts=${shell === null ? 0 : shell.inserts} bodies=${shell === null ? 0 : shell.bodies}`);
  } else {
    failures.push({ name: caseDef.name, problems });
    console.log(`FAIL  ${caseDef.name}  ${JSON.stringify(caseDef.source)}`);
    for (const problem of problems) console.log(`        ${problem}`);
  }
}

console.log("");
console.log(`[op-proof] group=${groupName} cases=${cases.length} pass=${passed} fail=${failures.length} | 结构文本已核 ${checkedTexts} 条、InsertBetween 计数已核 ${checkedInserts} 条`);
if (failures.length > 0) process.exit(1);
