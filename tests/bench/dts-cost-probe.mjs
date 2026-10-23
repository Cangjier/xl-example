// 取证用探针：不修改任何业务源码，只在 require 之后包装 build/ts 的原型方法。
//
//   node tests/bench/dts-cost-probe.mjs --count --files 3        # 逐文件调用计数（每字符成本）
//   node tests/bench/dts-cost-probe.mjs --micro                  # 单次操作成本（ns）
//
// 口径：计量对象与 tests/bench/parse-perf.mjs 的 --dts 档一致——`SourceFileRunner.Parse(text, filePath)`，
// 只跑「字符流 → 形状树」，不含 AST 投影。
//
// buffer 契约（BUFFER-CONTRACT §1.2 / §1.4）之后的两处调整：
//   - `--micro` 的 `new Source` / `doc.At` / `s.Value` 三条换成 `SourceRange` 的对应物
//     （`new SourceRange(doc,i,i+1)` / `range.At(i)`），因为 `Source` 与 `Document.At` 已删除；
//   - 原「队列 push+splice」那条量的是已删除的 `SourceQueue` / `ProcessSource`，改为
//     **不可用（unavailable）** 并写明原因，另给一条 `ReloadMessage` 的 push+splice 作成本参照。
//   - `--count` 档的包装名单按新方法名更新（`ProcessSingle` / `DrainQueue` 已不存在）。
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
  "WhichUnitRangeContains", "At", "Has", "GetState", "SetState",
  "ComputePossibleShapesByIndex", "ComputeByIndex", "BuildByIndex", "IsInRange",
  "IsAppend", "Transit", "Default", "GetCount", "ProcessRange", "DrainMessages",
  "ComputePossibleShapes", "FromRanges", "IsBuildable", "TrySignOut", "SignOutToken",
]);

function instrumentModule(mod, file) {
  const base = path.basename(file, ".js");
  for (const name of Object.keys(mod)) {
    const exp = mod[name];
    if (typeof exp !== "function" || !exp.prototype) {
      if (typeof exp === "function" && WATCH.has(name)) {
        // 静态转调函数（例如 `SourceRange.Whole` / `SourceRange.Of`）：不包装，避免改变 this 语义。
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
  // buffer 契约之后：`Source`（core/syntax/source.js）、`Document.At`、`ProcessSource`
  // （core/syntax/process-source.js）都已删除；下面每条 label 都写了它替代的旧项。
  const { SourceRange } = require(path.join(buildTs, "core", "syntax", "source-range.js"));
  const { Document } = require(path.join(buildTs, "core", "syntax", "document.js"));
  const { ReloadMessage } = require(path.join(buildTs, "core", "syntax", "messages", "reload-message.js"));
  const { TextDocument } = require(path.join(buildTs, "typescript", "run", "text-document.js"));
  const { PossibleShapeCache } = require(path.join(buildTs, "core", "syntax", "possible-shape-cache.js"));
  const { Token } = require(path.join(buildTs, "core", "syntax", "token.js"));

  const text = "a".repeat(1 << 20);
  const doc = new TextDocument(text, "micro.ts");
  const whole = SourceRange.Whole(doc); // [0, GetCount())：At 合法域，且 At 自身不分配对象
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
  rows.push(time("new SourceRange(doc,i,i+1)  [旧 new Source(doc,i)]", (i) => !!new SourceRange(doc, i % 1000000, (i % 1000000) + 1)));
  rows.push(time("range.At(i)  [旧 doc.At(i)；新实现不分配]", (i) => whole.At(i % 1000000) !== "\0"));
  rows.push(time("doc.GetValue(i)  [text[i]]", (i) => doc.GetValue(i % 1000000) !== "\0"));
  rows.push(time("range.At(5)  [旧 s.Value]", () => whole.At(5) !== "\0"));

  // 队列：旧项量的是 SourceQueue 的 push + splice(0,1)。SourceQueue / ProcessSource 已随
  // 契约删除（§1.4：驱动改为 SyntaxContext.ProcessRange，不再经队列），该项**无对应物**。
  rows.push({
    label: "queue push+splice(0,1) per item",
    unavailable: true,
    note: "SourceQueue / ProcessSource 已删除（BUFFER-CONTRACT §1.4），无对应物，此项不可测",
  });
  // 成本参照：若仍要量「数组队列 push + 头删」，驱动层唯一还在排队的是 ReloadMessage。
  const q = [];
  rows.push(time("ReloadMessage push+splice(0,1) per item（队列成本参照）", (i) => {
    q.push(new ReloadMessage(null, i % 1000000));
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
