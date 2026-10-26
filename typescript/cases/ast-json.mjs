// 生成用例的两份 AST 快照：
//   <构造>.ts-ast.json   —— TypeScript 自己给的 AST（ts.createSourceFile，语义层）
//   <构造>.cj-ast.json   —— 本仓当前解析出的形状树（形状类名 + 区间 + 字段 + 子节点）
//
//   node typescript/cases/ast-json.mjs              # 全量：typescript/cases/astjson/*.ts
//   node typescript/cases/ast-json.mjs import       # 只跑指定构造（可给多个）
//
// 两份都按「一行一个用例」对齐，逐条对比即可看出 gap：某条在 cj 侧是 error，
// 或两侧的子节点 / 字段对不上，就是缺口。对拍见 ast-json-diff.mjs。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createAstCore, cjAst } from "./ast-compare.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
// 用例与两份快照统一放在 astjson/ 子目录：脚本留在 cases/ 根，语料不与尺子混放。
const casesDir = path.join(here, "astjson");
const root = path.resolve(here, "../..");
const require = createRequire(import.meta.url);
const ts = require(path.join(root, "node_modules", "typescript"));

const { SourceFileRunner } = require(path.join(root, "build/ts/typescript/run/source-file-runner.js"));

// 构造名 = 用例文件名去掉 .ts；astjson/ 里的 *.ts 就是全部可用构造。
function availableStems() {
  return fs
    .readdirSync(casesDir)
    .filter((name) => name.endsWith(".ts") && fs.statSync(path.join(casesDir, name)).isFile())
    .map((name) => name.slice(0, -3))
    .sort();
}

function selectedStems(args) {
  const all = availableStems();
  if (args.length === 0) return all;
  const unknown = [];
  const picked = new Set();
  for (const arg of args) {
    const base = path.basename(arg);
    const stem = base.endsWith(".ts") ? base.slice(0, -3) : base;
    if (all.includes(stem)) picked.add(stem);
    else unknown.push(arg);
  }
  if (unknown.length > 0) {
    console.error(`未知构造：${unknown.join(", ")}`);
    console.error(`可用构造：${all.join(", ")}`);
    process.exit(1);
  }
  return [...picked];
}

// Case text may ENCODE a newline as the two characters backslash + `n`, so a multi-line
// statement still fits on one physical line (every physical line is one case). That decode
// must NOT run inside a string / template / regex literal: there `\n` is a real escape
// sequence belonging to the case (`"\n";`, `` `\n`; ``), and decoding it would turn the case
// into a broken multi-line literal (TS then splits it into different statements).
// So scan the line, track literal state, and only expand backslash+`n` in ordinary code.
function decodeCaseText(line) {
  let out = "";
  const stack = [];
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    const top = stack.length === 0 ? "code" : stack[stack.length - 1];
    if (top === "code") {
      if (ch === "/" && line[i + 1] === "/") {
        out += line.slice(i).replace(/\\n/g, "\n");
        break;
      }
      if (ch === "/" && line[i + 1] === "*") {
        const end = line.indexOf("*/", i + 2);
        const stop = end < 0 ? line.length : end + 2;
        out += line.slice(i, stop).replace(/\\n/g, "\n");
        i = stop;
        continue;
      }
      if (ch === '"') { stack.push("dq"); out += ch; i++; continue; }
      if (ch === "'") { stack.push("sq"); out += ch; i++; continue; }
      if (ch === "`") { stack.push("tpl"); out += ch; i++; continue; }
      if (ch === "/") {
        let p = out.length - 1;
        while (p >= 0 && (out[p] === " " || out[p] === "\t")) p--;
        const prev = p >= 0 ? out[p] : "";
        if (prev === "" || "([{,;:!&|?=+-*%^~<>".includes(prev)) {
          stack.push("regex");
          out += ch; i++; continue;
        }
        out += ch; i++; continue;
      }
      if (ch === "\\" && line[i + 1] === "n") { out += "\n"; i += 2; continue; }
      // `\v` / `\f` are encoded too, so a case whose trailing trivia is U+000B / U+000C
      // still fits on one physical line (and `.trim()` cannot eat it). Same literal-state
      // protection as `\n`: inside a string / template / regex these are real escapes.
      if (ch === "\\" && line[i + 1] === "v") { out += "\u000B"; i += 2; continue; }
      if (ch === "\\" && line[i + 1] === "f") { out += "\u000C"; i += 2; continue; }
      out += ch; i++; continue;
    }
    if (top === "regex" || top === "class") {
      if (ch === "\\") { out += line.slice(i, i + 2); i += 2; continue; }
      if (top === "regex" && ch === "[") { stack.push("class"); out += ch; i++; continue; }
      if (top === "regex" && ch === "/") { stack.pop(); out += ch; i++; continue; }
      if (top === "class" && ch === "]") { stack.pop(); out += ch; i++; continue; }
      out += ch; i++; continue;
    }
    if (top === "sq" || top === "dq") {
      if (ch === "\\") { out += line.slice(i, i + 2); i += 2; continue; }
      if ((top === "sq" && ch === "'") || (top === "dq" && ch === '"')) {
        stack.pop(); out += ch; i++; continue;
      }
      out += ch; i++; continue;
    }
    if (top === "tpl") {
      if (ch === "\\") { out += line.slice(i, i + 2); i += 2; continue; }
      if (ch === "`") { stack.pop(); out += ch; i++; continue; }
      if (ch === "$" && line[i + 1] === "{") { stack.push("expr"); out += "${"; i += 2; continue; }
      out += ch; i++; continue;
    }
    if (top === "expr") {
      if (ch === "}") { stack.pop(); out += ch; i++; continue; }
      if (ch === '"') { stack.push("dq"); out += ch; i++; continue; }
      if (ch === "'") { stack.push("sq"); out += ch; i++; continue; }
      if (ch === "`") { stack.push("tpl"); out += ch; i++; continue; }
      if (ch === "\\" && line[i + 1] === "n") { out += "\n"; i += 2; continue; }
      out += ch; i++; continue;
    }
    out += ch; i++;
  }
  return out;
}

function readCases(stem) {
  const source = fs.readFileSync(path.join(casesDir, `${stem}.ts`), "utf8");
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("//"))
    .map((line) => decodeCaseText(line));
}

// 归一表 / tsAst / cjAst 只有 ast-compare.mjs 一份实现，这里直接取用。
const { tsAst } = createAstCore(ts);

const stems = selectedStems(process.argv.slice(2));
let total = 0;
let okAll = 0;
for (const stem of stems) {
  const cases = readCases(stem);
  const tsCases = [];
  const cjCases = [];
  for (const src of cases) {
    const file = ts.createSourceFile("case.ts", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    tsCases.push({ src, ast: file.statements.map(tsAst) });
    try {
      const rootShape = SourceFileRunner.Parse(src, "case.ts");
      cjCases.push({ src, ast: rootShape.Data.map(cjAst) });
    } catch (error) {
      let message = "";
      for (let node = error; node; node = node.InnerException || node.innerException) {
        const text = node.Message || node.message;
        if (text) message = String(text);
      }
      cjCases.push({ src, error: message.split("\n")[0] || "unknown" });
    }
  }
  fs.writeFileSync(path.join(casesDir, `${stem}.ts-ast.json`), JSON.stringify({ cases: tsCases }, null, 2) + "\n");
  fs.writeFileSync(path.join(casesDir, `${stem}.cj-ast.json`), JSON.stringify({ cases: cjCases }, null, 2) + "\n");
  const ok = cjCases.filter((item) => !item.error).length;
  console.log(`[${stem}] cases=${cases.length} cj-ok=${ok} cj-fail=${cases.length - ok}`);
  total += cases.length;
  okAll += ok;
}
console.log(`total cases=${total} cj-ok=${okAll} cj-fail=${total - okAll}（${stems.length} 个构造）`);
