#!/usr/bin/env node
// tts 独立判据工具（不依赖 legacy 比较）。
//
// 两段式：
//   1) 逐字 AST line：导出 incremental 的逐字符 trace，并把 docs/expected-token-time-shapes.md
//      作为范本注入，交给 LLM 诊断（不提供 DSH 编写的“要求列表”）。
//   2) 完整解析：SourceFileRunner.Parse 的结果与 ts.createSourceFile 对拍。
//
// 用法：
//   node typescript/cases/tts/tools/tshape-judge.mjs trace  <case.ts> [--out <dir>]
//   node typescript/cases/tts/tools/tshape-judge.mjs ts     <case.ts> [--out <dir>]
//   node typescript/cases/tts/tools/tshape-judge.mjs bundle <case.ts> [--out <dir>]
//   node typescript/cases/tts/tools/tshape-judge.mjs ts-all [--filter <substr>]
//
// 退出码：ts 对拍不一致 1；工具/环境错误 2；trace/bundle 正常 0。

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  createAstCore,
  cjAst,
  flatten,
  groupByKind,
  FIELD_NAMES,
  fieldOf,
} from "../../ast-compare.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..", "..", "..");
const require = createRequire(import.meta.url);
const BUILD = path.join(root, "build", "ts");
const TTS_TOOL = path.join(root, "tests", "parse", "token-time-shapes.mjs");
const EXEMPLAR = path.join(root, "docs", "expected-token-time-shapes.md");

function fail(message, code = 2) {
  console.error(message);
  process.exit(code);
}

const ts = require(path.join(root, "node_modules", "typescript"));
const { SourceFileRunner } = require(path.join(BUILD, "typescript", "run", "source-file-runner.js"));
const { tsAst } = createAstCore(ts);

const args = process.argv.slice(2);
const command = args[0];
const value = (name, fallback = "") => {
  const at = args.indexOf(name);
  return at >= 0 && at + 1 < args.length ? args[at + 1] : fallback;
};
const positional = args.slice(1).filter((arg, index) => {
  if (arg.startsWith("--")) return false;
  const prev = args.slice(1)[index - 1];
  return !(prev === "--out" || prev === "--filter" || prev === "--from" || prev === "--to");
});
const outDirArg = value("--out", "");
const filter = value("--filter", "");

function outDirFor(file) {
  if (outDirArg) return path.resolve(outDirArg);
  return path.join(root, "tmp", "tshape-judge", path.basename(file, ".ts"));
}

function rel(file) {
  return path.relative(root, path.resolve(file)).replace(/\\/g, "/");
}

// ---------------------------------------------------------------- part 2: TS AST
function compareWithTs(file) {
  const source = fs.readFileSync(file, "utf8");
  const fileNode = ts.createSourceFile(
    path.basename(file),
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const diagnostics = (fileNode.parseDiagnostics || []).map((d) =>
    ts.flattenDiagnosticMessageText(d.messageText, " "),
  );
  if (diagnostics.length > 0) {
    return { status: "ts-invalid", diagnostics };
  }

  let rootShape;
  try {
    rootShape = SourceFileRunner.Parse(source, path.basename(file));
  } catch (error) {
    let message = "";
    for (let node = error; node; node = node.InnerException || node.innerException) {
      const text = node.Message || node.message;
      if (text) message = String(text);
    }
    return { status: "parse-error", message: (message.split("\n")[0] || "unknown").slice(0, 240) };
  }

  const theirs = flatten(fileNode.statements.map(tsAst));
  const ours = flatten((rootShape.Data || []).map((shape) => cjAst(shape)));
  const theirKinds = groupByKind(theirs);
  const ourKinds = groupByKind(ours);

  const structural = [];
  for (const kind of new Set([...theirKinds.keys(), ...ourKinds.keys()])) {
    const delta = (ourKinds.get(kind)?.length || 0) - (theirKinds.get(kind)?.length || 0);
    if (delta !== 0) structural.push(`${kind}${delta > 0 ? "+" : ""}${delta}`);
  }
  const moved = [];
  const fields = [];
  for (const [kind, theirList] of theirKinds) {
    const ourList = ourKinds.get(kind);
    if (!ourList || ourList.length !== theirList.length) continue;
    for (let index = 0; index < theirList.length; index++) {
      if (theirList[index].pos !== ourList[index].pos || theirList[index].end !== ourList[index].end) {
        moved.push(
          `${kind}[${index}] ${theirList[index].pos}-${theirList[index].end} vs ${ourList[index].pos}-${ourList[index].end}`,
        );
      }
      for (const name of FIELD_NAMES) {
        const a = fieldOf(theirList[index], name);
        const b = fieldOf(ourList[index], name);
        if (String(a) !== String(b)) fields.push(`${kind}[${index}].${name} ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
      }
    }
  }
  const ok = structural.length === 0 && moved.length === 0 && fields.length === 0;
  return { status: ok ? "ok" : "diff", structural, moved, fields };
}

// ---------------------------------------------------------------- part 1: trace
function rawTrace(file) {
  let raw = "";
  try {
    raw = execFileSync(process.execPath, [TTS_TOOL, path.resolve(file), "--json", "--incremental"], {
      cwd: root,
      maxBuffer: 512 * 1024 * 1024,
      encoding: "utf8",
    });
  } catch (error) {
    raw = error.stdout ? String(error.stdout) : "";
    if (!raw) fail(String(error.stderr || error));
  }
  return JSON.parse(raw);
}

const cleanLine = (line) =>
  line
    .replace(/src=\[(-?\d+|\.\.\.),(-?\d+|\.\.\.)\)/g, (_m, a, b) => `src=[${a === "..." ? "…" : "N"},${b === "..." ? "…" : "N"})`)
    .replace(/pos=-?\d+/g, "pos=…")
    .replace(/text="[^"]*"/g, 'text="…"');
const isShapeLine = (line) => /^(?:[│ ]*[├└]─ )?[A-Za-z_$][\w$]*Shape\b/.test(line);
const shapeSignature = (lines) => lines.filter(isShapeLine).map(cleanLine).join("\n");
const errorText = (error) => {
  if (!error) return "";
  if (typeof error === "string") return error;
  return String(error.message ?? error.Message ?? JSON.stringify(error));
};

function digestTrace(file, data) {
  const steps = data.steps || [];
  const first = new Map();
  const events = [];
  let prev = "";
  for (const step of steps) {
    for (const line of step.lines || []) {
      const m = line.match(/^(?:[│ ]*[├└]─ )?([A-Za-z_$][\w$]*Shape)\b/);
      if (m && !first.has(m[1])) first.set(m[1], { step: step.index, char: step.char ?? "EOF" });
    }
    const sig = shapeSignature(step.lines || []);
    if (sig !== prev) {
      events.push(step);
      prev = sig;
    }
  }
  const last = steps[steps.length - 1];
  const out = [];
  out.push(`- 源文件: \`${rel(file)}\``);
  out.push(`- 步数: ${steps.length}`);
  out.push(`- 增量抛错: ${last?.error ? "`" + errorText(last.error).replace(/\n/g, " ") + "`" : "无"}`);
  out.push("");
  out.push("### 首见形状");
  out.push("");
  out.push("| shape | step | char |");
  out.push("| --- | ---: | --- |");
  for (const [name, at] of [...first.entries()].sort((a, b) => a[1].step - b[1].step)) {
    out.push(`| ${name} | ${at.step} | ${JSON.stringify(at.char)} |`);
  }
  out.push("");
  out.push(`### 结构变化事件（${events.length}）`);
  out.push("");
  const cap = 40;
  const shown = events.length <= cap ? events : [...events.slice(0, cap / 2), ...events.slice(-cap / 2)];
  for (const step of shown) {
    out.push(`#### step ${step.index} ${JSON.stringify(step.char ?? "EOF")}${step.error ? " ERROR" : ""}`);
    out.push("```text");
    const lines = step.lines || [];
    out.push(...lines.slice(0, 40));
    if (lines.length > 40) out.push(`…（共 ${lines.length} 行）`);
    out.push("```");
    if (step.error) out.push(`> error: ${errorText(step.error).replace(/\n/g, " ")}`);
    out.push("");
  }
  if (events.length > cap) out.push(`…（省略 ${events.length - cap} 个结构变化事件）`);
  if (last && !shown.includes(last)) {
    out.push(`#### final step ${last.index} ${JSON.stringify(last.char ?? "EOF")}${last.error ? " ERROR" : ""}`);
    out.push("```text");
    out.push(...(last.lines || []).slice(0, 40));
    out.push("```");
    if (last.error) out.push(`> error: ${errorText(last.error).replace(/\n/g, " ")}`);
  }
  return out.join("\n");
}

function writeJson(dir, name, value) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2), "utf8");
}

function writeSteps(dir, data) {
  fs.mkdirSync(dir, { recursive: true });
  const rows = (data.steps || []).map((step) =>
    JSON.stringify({
      index: step.index,
      char: step.char ?? null,
      error: errorText(step.error) || null,
      lines: step.lines || [],
    }),
  );
  fs.writeFileSync(path.join(dir, "trace-steps.jsonl"), rows.join("\n") + "\n", "utf8");
}

function oneFileArg() {
  const file = positional[0];
  if (!file) fail(`缺少 case 路径。用法见文件头。`);
  if (!fs.existsSync(file)) fail(`文件不存在：${file}`);
  return path.resolve(file);
}

function cmdTrace() {
  const file = oneFileArg();
  const dir = outDirFor(file);
  const data = rawTrace(file);
  writeJson(dir, "trace.json", data);
  writeSteps(dir, data);
  const digest = digestTrace(file, data);
  fs.writeFileSync(path.join(dir, "trace.md"), digest, "utf8");
  console.log(path.join(dir, "trace.md"));
}

function cmdTs() {
  const file = oneFileArg();
  const dir = outDirFor(file);
  const result = compareWithTs(file);
  writeJson(dir, "ts.json", result);
  console.log(JSON.stringify(result, null, 2));
  if (result.status === "ts-invalid" || result.status === "parse-error" || result.status === "diff") process.exit(1);
}

function cmdBundle() {
  const file = oneFileArg();
  const dir = outDirFor(file);
  const data = rawTrace(file);
  const result = compareWithTs(file);
  writeJson(dir, "trace.json", data);
  writeSteps(dir, data);
  writeJson(dir, "ts.json", result);
  const digest = digestTrace(file, data);
  const source = fs.readFileSync(file, "utf8");
  const exemplar = fs.readFileSync(EXEMPLAR, "utf8");
  const lines = [];
  lines.push(`# tts judge bundle: ${path.basename(file)}`);
  lines.push("");
  lines.push("## 0. 任务");
  lines.push("");
  lines.push("这是一个独立的 tts 判据包，**不要与 legacy 比较**（legacy 不是标准，可能自身有错）。");
  lines.push("最终正确性标准只有 `ts.createSourceFile`；逐字 AST line 没有官方对照，");
  lines.push("请**只以第 1 节注入的范本**为依据，诊断第 3 节逐字 trace 是否合规。");
  lines.push("");
  lines.push("输出：逐条诊断，每条含 `step` / `char` / 证据（AST line 原文）/ 结论；");
  lines.push("结论只能是 `bug`（增量实现不符合范本）、`expected`（范本允许的中间态）或 `case-issue`（case 自己有问题）。");
  lines.push("不要输出“要求列表”，不要引用 legacy 树。");
  lines.push("");
  lines.push("## 1. 范本（唯一示范）");
  lines.push("");
  lines.push(exemplar.trim());
  lines.push("");
  lines.push("## 2. 目标 case 源码");
  lines.push("");
  lines.push("```ts");
  lines.push(source.replace(/\r\n/g, "\n").trimEnd());
  lines.push("```");
  lines.push("");
  lines.push("## 3. 逐字 trace（incremental）");
  lines.push("");
  lines.push("> 下面是「shape 集合变化」摘要，**不是每字符全量**；basic token 的逐步挂载可查同目录");
  lines.push("> `trace-steps.jsonl`（每行一个 step），或直接：");
  lines.push("> `node typescript/cases/tts/tools/tshape-judge.mjs steps <case.ts> --from <n> --to <m>`。");
  lines.push("");
  lines.push(digest);
  lines.push("");
  lines.push("## 4. 完整解析 vs ts.createSourceFile");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(result, null, 2));
  lines.push("```");
  fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, "judge-prompt.md");
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(outPath);
}

function listCases() {
  const dirs = [
    path.join(root, "typescript", "cases", "tts", "cases"),
    path.join(root, "typescript", "cases", "tts-impl", "cases"),
  ];
  const files = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (name.endsWith(".ts")) files.push(full);
    }
  };
  for (const dir of dirs) walk(dir);
  return files.sort();
}

function cmdSteps() {
  const file = oneFileArg();
  const data = rawTrace(file);
  const from = Number(value("--from", "0"));
  const to = Number(value("--to", String(from + 20)));
  const steps = (data.steps || []).slice(from, to + 1);
  for (const step of steps) {
    console.log(`## step ${step.index} ${JSON.stringify(step.char ?? "EOF")}${step.error ? " ERROR" : ""}`);
    console.log("```text");
    console.log((step.lines || []).slice(0, 80).join("\n"));
    console.log("```");
    if (step.error) console.log(`> error: ${errorText(step.error).replace(/\n/g, " ")}`);
    console.log("");
  }
}

function cmdTsAll() {
  const files = listCases().filter((file) => !filter || rel(file).includes(filter));
  const failures = [];
  let ok = 0;
  for (const file of files) {
    const result = compareWithTs(file);
    if (result.status === "ok") ok++;
    else failures.push({ file: rel(file), ...result });
  }
  const summary = { total: files.length, ok, failures: failures.length, details: failures };
  fs.mkdirSync(path.join(root, "tmp", "tshape-judge"), { recursive: true });
  const outPath = path.join(root, "tmp", "tshape-judge", "ts-all.json");
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify({ total: summary.total, ok: summary.ok, failures: summary.failures }, null, 2));
  console.log(outPath);
  if (failures.length > 0) process.exit(1);
}

switch (command) {
  case "trace":
    cmdTrace();
    break;
  case "ts":
    cmdTs();
    break;
  case "bundle":
    cmdBundle();
    break;
  case "steps":
    cmdSteps();
    break;
  case "ts-all":
    cmdTsAll();
    break;
  default:
    fail("用法：trace <case.ts> | ts <case.ts> | bundle <case.ts> | ts-all [--filter <substr>]", 2);
}
