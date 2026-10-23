// 取证用探针：不修改任何业务源码，只在 require 之后包装 build/ts 的原型方法。
//
//   node tests/bench/dts-cost-probe.mjs --count --files 3        # 逐文件调用计数（每字符成本）
//   node tests/bench/dts-cost-probe.mjs --micro                  # 单次操作成本（ns）
//
// 口径：计量对象与 tests/bench/parse-perf.mjs 的 --dts 档一致——`SourceFileRunner.Parse(text, filePath)`，
// 只跑「字符流 → 形状树」，不含 AST 投影。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const buildTs = path.join(root, "build", "ts");

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

const counts = new Map();
const bump = (key) => counts.set(key, (counts.get(key) ?? 0) + 1);

const WATCH = new Set([
  "Process", "TryToClose", "Add", "SignOut", "SignIn", "Close", "Undo",
  "WhichUnitRangeContains", "At", "GetState", "SetState",
  "ComputePossibleShapesByIndex", "ComputeByIndex", "BuildByIndex", "IsInRange",
  "IsAppend", "Transit", "Default", "GetCount", "ProcessSingle", "DrainQueue",
  "DrainMessages", "ComputePossibleShapes", "FromRanges", "IsBuildable",
]);

function instrumentModule(mod, file) {
  const base = path.basename(file, ".js");
  for (const name of Object.keys(mod)) {
    const exp = mod[name];
    if (typeof exp !== "function" || !exp.prototype) {
      if (typeof exp === "function" && WATCH.has(name)) {
        // 静态转调函数（例如 Source.EOF）：不包装，避免改变 this 语义。
      }
      continue;
    }
    // 实例方法
    for (const m of Object.getOwnPropertyNames(exp.prototype)) {
      if (m === "constructor" || !WATCH.has(m)) continue;
      const desc = Object.getOwnPropertyDescriptor(exp.prototype, m);
      if (!desc || typeof desc.value !== "function") continue;
      const original = desc.value;
      const key = `${base}:${exp.name}.${m}`;
      Object.defineProperty(exp.prototype, m, {
        configurable: true,
        writable: true,
        value: function (...args) {
          bump(key);
          return original.apply(this, args);
        },
      });
    }
    // 静态 Transit：Template.BasicBranchQueue 在第一次调用时才读这些引用，
    // 所以在第一次 Parse 之前包装就能被队列捕获。
    for (const m of ["Transit"]) {
      const desc = Object.getOwnPropertyDescriptor(exp, m);
      if (!desc || typeof desc.value !== "function") continue;
      const original = desc.value;
      const key = `static:${exp.name}.${m}`;
      Object.defineProperty(exp, m, {
        configurable: true,
        writable: true,
        value: function (...args) {
          bump(key);
          return original.apply(this, args);
        },
      });
    }
  }
}

for (const file of walk(buildTs)) {
  let mod;
  try {
    mod = require(file);
  } catch {
    continue;
  }
  instrumentModule(mod, file);
}

const { SourceFileRunner } = require(path.join(buildTs, "typescript", "run", "source-file-runner.js"));

function collectDtsFiles(n) {
  const libDir = path.join(root, "node_modules", "typescript", "lib");
  return fs
    .readdirSync(libDir)
    .filter((name) => name.endsWith(".d.ts"))
    .map((name) => ({ name, full: path.join(libDir, name), size: fs.statSync(path.join(libDir, name)).size }))
    .sort((a, b) => b.size - a.size || a.name.localeCompare(b.name))
    .slice(0, n);
}

function reset() {
  counts.clear();
}

function rowCounts(chars) {
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return rows.map(([key, value]) => ({ key, value, perChar: value / chars }));
}

const argv = process.argv.slice(2);
const doCount = argv.includes("--count") || argv.length === 0;
const doMicro = argv.includes("--micro");
const filesIdx = argv.indexOf("--files");
const fileCount = filesIdx >= 0 ? Number(argv[filesIdx + 1] ?? 3) : 3;

if (doCount) {
  const files = collectDtsFiles(fileCount);
  const out = [];
  for (const file of files) {
    const text = fs.readFileSync(file.full, "utf8");
    SourceFileRunner.Parse(text, file.name); // warmup
    reset();
    const start = process.hrtime.bigint();
    const shape = SourceFileRunner.Parse(text, file.name);
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    out.push({ file: file.name, bytes: file.size, chars: text.length, stmts: shape.Data.length, ms: +ms.toFixed(1), counts: rowCounts(text.length) });
  }
  console.log(JSON.stringify({ mode: "count", files: out }, null, 2));
}

if (doMicro) {
  const { Source } = require(path.join(buildTs, "core", "syntax", "source.js"));
  const { Document } = require(path.join(buildTs, "core", "syntax", "document.js"));
  const { ProcessSource } = require(path.join(buildTs, "core", "syntax", "process-source.js"));
  const { TextDocument } = require(path.join(buildTs, "typescript", "run", "text-document.js"));
  const { PossibleShapeCache } = require(path.join(buildTs, "core", "syntax", "possible-shape-cache.js"));
  const { Token } = require(path.join(buildTs, "core", "syntax", "token.js"));

  const text = "a".repeat(1 << 20);
  const doc = new TextDocument(text, "micro.ts");
  const N = 2_000_000;

  const time = (label, fn, n = N) => {
    for (let i = 0; i < Math.min(n, 200000); i++) fn(i);
    const start = process.hrtime.bigint();
    let sink = 0;
    for (let i = 0; i < n; i++) sink += fn(i) ? 1 : 0;
    const ns = Number(process.hrtime.bigint() - start) / n;
    return { label, nsPerOp: +ns.toFixed(2), sink };
  };

  const rows = [];
  rows.push(time("new Source(doc,i)", (i) => !!new Source(doc, i % 1000000)));
  rows.push(time("doc.At(i)  [= new Source + call]", (i) => !!doc.At(i % 1000000)));
  rows.push(time("doc.GetValue(i)  [text[i]]", (i) => doc.GetValue(i % 1000000) !== "\0"));
  const s = new Source(doc, 5);
  rows.push(time("s.Value  [getter + GetValue]", (i) => s.Value !== "\0"));

  // 队列：push + splice(0,1) 对比 「push + 头指针」
  const q = [];
  rows.push(time("queue push+splice(0,1) per item", (i) => {
    q.push(new ProcessSource(null, s));
    const head = q[0];
    q.splice(0, 1);
    return head !== null;
  }));

  // Map<string,any> 查找：constructor.name 作键 vs 预置符号键
  const cache = new PossibleShapeCache();
  class SomeShape {}
  const inst = new SomeShape();
  cache.SetState(SomeShape.name, { at: 0 });
  rows.push(time("cache.GetState(this.constructor.name)", () => cache.GetState(inst.constructor.name) !== null));
  const sym = Symbol("state");
  const holder = { [sym]: { at: 0 } };
  rows.push(time("obj[Symbol] 直接取", () => holder[sym] !== null));
  rows.push(time("this.constructor.name", () => inst.constructor.name.length > 0));

  // token 追加一个字符
  const tok = new Token(null);
  tok.Temp = "";
  rows.push(time("token.Temp += ch（1 字符）", (i) => {
    tok.Temp += "a";
    if (tok.Temp.length > 32) tok.Temp = "";
    return true;
  }));

  console.log(JSON.stringify({ mode: "micro", rows }, null, 2));
}
