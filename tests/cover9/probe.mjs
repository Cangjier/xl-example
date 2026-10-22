// cover9 候选 case 探针（可直接运行，只读：不写任何文件）
//
//   node tests/cover9/probe.mjs            # 全部候选：逐条打印 TS 诊断 / 本仓结果 / 是否 red
//   node tests/cover9/probe.mjs --quiet    # 只打印汇总与「存储值 vs 实测」偏差
//
// 口径与 typescript/cases/ast-json-diff.mjs 完全一致：
//   - TS 真值：本仓 node_modules 里的 TypeScript 6.0.3 `ts.createSourceFile(..., ScriptKind.TS)`；
//   - 本仓：build/ts/typescript/run/source-file-runner.js 的 SourceFileRunner.Parse；
//   - 两侧经 typescript/cases/ast-compare.mjs 的 createAstCore/cjAst 归一后做三栏比较
//     （结构 / 位置 / 字段）。
// 硬性口径：只有 TS `parseDiagnostics.length === 0` 且（本仓 crash 或三栏任一不一致）才算真红；
// TS 自身非法（ts-invalid）的候选不是 case，也不进修复清单。
//
// candidates.json 的 input 是转义写法，本脚本按下面的规则解码：
//   \\ -> \    \n -> LF    \r -> CR    \u2028 -> U+2028    \u2029 -> U+2029
// 写进 typescript/cases/*.ts 时：\n 继续用 `\n` 转义；LF/CR/LS/PS 中 CR/LS/PS 用**行内字面字符**
// （CR 也可用真 CR 字节，见根目录 .gitattributes 的 -text 规则），不要写成 \r / \u2028 转义。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const require = createRequire(import.meta.url);
const ts = require(path.join(root, "node_modules", "typescript"));
const { SourceFileRunner } = require(path.join(root, "build/ts/typescript/run/source-file-runner.js"));
const { createAstCore, cjAst, flatten, groupByKind, FIELD_NAMES, fieldOf } = await import(
  pathToFileURL(path.join(root, "typescript/cases/ast-compare.mjs")).href
);
const { tsAst } = createAstCore(ts);

const quiet = process.argv.includes("--quiet");

function decodeInput(text) {
  return text.replace(/\\u2028|\\u2029|\\r|\\n|\\\\/g, (m) => {
    if (m === "\\u2028") return "\u2028";
    if (m === "\\u2029") return "\u2029";
    if (m === "\\r") return "\r";
    if (m === "\\n") return "\n";
    return "\\";
  });
}

function firstError(error) {
  let message = "";
  for (let node = error; node; node = node.InnerException || node.innerException) {
    const text = node.Message || node.message;
    if (text) message = String(text);
  }
  return (message.split("\n")[0] || String(error)).trim();
}

function tsSummary(statements) {
  return statements.map((s) => `${ts.SyntaxKind[s.kind]}[${s.pos},${s.end})`).join("; ");
}

/** 实测一条候选；返回 { tsDiag, tsAstSummary, currentStatus }。 */
function measure(src) {
  const file = ts.createSourceFile("case.ts", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const result = {
    tsDiag: file.parseDiagnostics.length,
    tsAstSummary: tsSummary(file.statements),
    currentStatus: "",
  };
  if (file.parseDiagnostics.length > 0) {
    result.currentStatus =
      "ts-invalid: " + ts.flattenDiagnosticMessageText(file.parseDiagnostics[0].messageText, " ");
    return result;
  }
  let shape;
  try {
    shape = SourceFileRunner.Parse(src, "case.ts");
  } catch (error) {
    result.currentStatus = "red-crash: " + firstError(error);
    return result;
  }
  const theirs = flatten(file.statements.map(tsAst));
  const ours = flatten(shape.Data.map(cjAst));
  const theirKinds = groupByKind(theirs);
  const ourKinds = groupByKind(ours);
  const structural = [];
  for (const kind of new Set([...theirKinds.keys(), ...ourKinds.keys()])) {
    const delta = (ourKinds.get(kind)?.length || 0) - (theirKinds.get(kind)?.length || 0);
    if (delta !== 0) structural.push(`${kind}${delta > 0 ? " +" : " "}${delta}`);
  }
  const moved = [];
  for (const [kind, theirList] of theirKinds) {
    const ourList = ourKinds.get(kind);
    if (!ourList || ourList.length !== theirList.length) continue;
    for (let at = 0; at < theirList.length; at++) {
      const t = theirList[at], o = ourList[at];
      if (t.pos !== o.pos || t.end !== o.end) moved.push(`${kind} ts[${t.pos},${t.end}] cj[${o.pos},${o.end}]`);
    }
  }
  const fields = [];
  for (const [kind, theirList] of theirKinds) {
    const ourList = ourKinds.get(kind);
    if (!ourList || ourList.length !== theirList.length) continue;
    for (let at = 0; at < theirList.length; at++) {
      const t = theirList[at], o = ourList[at];
      if (t.pos !== o.pos || t.end !== o.end) continue;
      for (const name of FIELD_NAMES) {
        const tv = fieldOf(t, name), ov = fieldOf(o, name);
        if (String(tv) !== String(ov)) fields.push(`${kind}[${t.pos},${t.end}] ${name}: ts=${JSON.stringify(tv)} cj=${JSON.stringify(ov)}`);
      }
    }
  }
  if (!structural.length && !moved.length && !fields.length) {
    result.currentStatus = "green";
  } else {
    result.currentStatus =
      "red-diff: " +
      [
        structural.length ? `结构 ${structural.join(" / ")}` : "",
        moved.length ? `位置 ${moved.join(" / ")}` : "",
        fields.length ? `字段 ${fields.join(" / ")}` : "",
      ]
        .filter(Boolean)
        .join("；");
  }
  return result;
}

const candidatesPath = path.join(here, "candidates.json");
if (!fs.existsSync(candidatesPath)) {
  console.error(`缺少候选库：${candidatesPath}`);
  process.exit(1);
}
const doc = JSON.parse(fs.readFileSync(candidatesPath, "utf8"));
const candidates = doc.candidates || [];
if (candidates.length === 0) {
  console.error("candidates.json 里没有候选");
  process.exit(1);
}

const rows = [];
for (const candidate of candidates) {
  const src = decodeInput(candidate.input);
  const live = measure(src);
  rows.push({
    id: candidate.id,
    group: candidate.group,
    input: candidate.input,
    tsDiag: live.tsDiag,
    tsAstSummary: live.tsAstSummary,
    currentStatus: live.currentStatus,
    storedTsDiag: candidate.tsDiag,
    storedStatus: candidate.currentStatus,
    storedSummary: candidate.tsAstSummary,
    storedMatches: live.tsDiag === candidate.tsDiag && live.currentStatus === candidate.currentStatus,
  });
}

if (!quiet) {
  let currentGroup = "";
  for (const row of rows) {
    if (row.group !== currentGroup) {
      currentGroup = row.group;
      console.log(`\n== ${currentGroup} 组 ==`);
    }
    const status = row.currentStatus;
    const short = status.length > 96 ? status.slice(0, 96) + "…" : status;
    console.log(
      `${row.storedMatches ? " " : "!"} ${row.id}  diag=${row.tsDiag}  ${short}` +
        `\n    input: ${row.input}` +
        `\n    ts:    ${row.tsAstSummary}`,
    );
  }
}

const red = rows.filter((r) => r.currentStatus.startsWith("red-"));
const green = rows.filter((r) => r.currentStatus === "green");
const invalid = rows.filter((r) => r.currentStatus.startsWith("ts-invalid"));
const storedRed = rows.filter((r) => r.storedStatus && r.storedStatus.startsWith("red-"));
const mismatched = rows.filter((r) => !r.storedMatches);

console.log("\n================ cover9 probe summary ================");
console.log(`candidates: ${rows.length}  red=${red.length}  green=${green.length}  ts-invalid=${invalid.length}`);
for (const group of ["A", "B", "C"]) {
  const inGroup = rows.filter((r) => r.group === group);
  const gRed = inGroup.filter((r) => r.currentStatus.startsWith("red-"));
  const gGreen = inGroup.filter((r) => r.currentStatus === "green");
  const gInvalid = inGroup.filter((r) => r.currentStatus.startsWith("ts-invalid"));
  console.log(`  ${group}: total=${inGroup.length} red=${gRed.length} green=${gGreen.length} ts-invalid=${gInvalid.length}`);
  if (gRed.length) console.log(`     red ids:   ${gRed.map((r) => r.id).join(", ")}`);
  if (gGreen.length) console.log(`     green ids: ${gGreen.map((r) => r.id).join(", ")}`);
  if (gInvalid.length) console.log(`     ts-invalid ids: ${gInvalid.map((r) => r.id).join(", ")}`);
}
console.log(`stored(candidates.json) red=${storedRed.length}`);
if (mismatched.length) {
  console.log(`\n[FAIL] ${mismatched.length} 条候选的“存储值 vs 实测”不一致（candidates.json 过期或基线已变化）：`);
  for (const row of mismatched) {
    console.log(`  ${row.id}\n    stored: diag=${row.storedTsDiag} ${String(row.storedStatus).slice(0, 120)}\n    live:   diag=${row.tsDiag} ${row.currentStatus.slice(0, 120)}`);
  }
  process.exitCode = 1;
} else {
  console.log("存储值 vs 实测：全部一致");
}
console.log("说明：green 不是 case（已绿，仅作回归对照）；只有 red 才能按组写入对应 targetStem。");
