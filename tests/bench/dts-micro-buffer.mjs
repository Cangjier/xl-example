// buffer 期微基准：量的是「每次操作多少 ns」，配合 dts-cost-probe --count 的每字符次数，
// 就能把「计数 × 单次成本 ≈ ms」对上 profile 里的 self 时间。
//
//   node tests/bench/dts-micro-buffer.mjs                 # 默认档（真实 lib.dom 文档 + 合成文档）
//   node tests/bench/dts-micro-buffer.mjs --trials 7       # 多轮取中位，抗抖动
//   node tests/bench/dts-micro-buffer.mjs --json
//
// 与 dts-cost-probe.mjs --micro 的分工：
//   --micro 量的是**孤立的**原型方法（而且用 1MB "a" 合成文档）；这里补两件事：
//     1) 用**真实 lib.dom 文本**做文档，读字符的缓存局部性与真实一致；
//     2) 量一条**完整驱动循环**（while (i < end) { At(i++) }）——单次 At 会被内联，
//        孤立测出来的 ns 偏高，而 profile 里 At 的 self 只有 0.7%（因为都被内联进了调用者），
//        所以真正能乘回 ms 的是这条「每字符驱动下限」。
// 成本口径：每档先暖机，再跑 --trials 轮取中位；报 ns/op，并单列 noop 的循环开销供读者扣减。
// 确定性：无随机数、不写文件、不读网络。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const buildTs = path.join(root, "build", "ts");

const argv = process.argv.slice(2);
const ti = argv.indexOf("--trials");
const trials = ti >= 0 ? Number(argv[ti + 1] ?? 5) : 5;
const asJson = argv.includes("--json");

const { SourceRange } = require(path.join(buildTs, "core", "syntax", "source-range.js"));
const { TextDocument } = require(path.join(buildTs, "typescript", "run", "text-document.js"));
const { Token } = require(path.join(buildTs, "core", "syntax", "token.js"));
const { BlockToken } = require(path.join(buildTs, "core", "syntax", "block-token.js"));
const { ItemSlotCache } = require(path.join(buildTs, "core", "syntax", "possible-shape-cache.js"));

const median = (values) => {
  const s = values.slice().sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

// 真实语料：lib.dom（与 profile 的归因对象同一份）；截到 256K 字符只是为了少占内存，
// 读字符的形态不变（仍是长 ASCII 文本）。
const libDom = path.join(root, "node_modules", "typescript", "lib", "lib.dom.d.ts");
if (!fs.existsSync(libDom)) throw new Error(`缺少语料 ${libDom}（先安装 node_modules）`);
const realText = fs.readFileSync(libDom, "utf8").slice(0, 262144);
const doc = new TextDocument(realText, "lib.dom.d.ts");
const count = doc.GetCount();
const whole = SourceRange.Whole(doc); // [0, count)

// 32 字符窗口：驱动层每窗口一个，At 的合法域就是它。
const windowSize = 32;
const windows = [];
for (let i = 0; i + 1 < count; i += windowSize) windows.push(new SourceRange(doc, i, Math.min(i + windowSize, count)));

// 逃逸分析的坑：`new Token(null) !== null` 这种写法里对象没人用，V8 会把分配整个消掉，
// 于是"分配成本"量出来接近 noop（第一版就踩到了：Token 5.25 ns vs BlockToken 47 ns）。
// 分配档必须把对象**存进一个长期存活的环形槽**，强迫它真的落到堆上。
const KEEP = new Array(1024).fill(null);

/**
 * 一档测量：暖机 → trials 轮计时，取每轮 ns/op 的中位。
 * fn(i) 的结果必须被一个 sink 吃掉，否则整段会被 V8 消除。
 */
const results = [];
function bench(label, note, fn, n = 2_000_000) {
  const warm = Math.min(n, 200_000);
  let sink = 0;
  for (let i = 0; i < warm; i++) sink += fn(i) ? 1 : 0;
  const perTrial = [];
  let totalSink = sink;
  for (let t = 0; t < trials; t++) {
    const start = process.hrtime.bigint();
    let local = 0;
    for (let i = 0; i < n; i++) local += fn(i) ? 1 : 0;
    const ns = Number(process.hrtime.bigint() - start) / n;
    totalSink += local;
    perTrial.push(ns);
  }
  const nsPerOp = median(perTrial);
  results.push({
    label,
    note,
    nsPerOp: +nsPerOp.toFixed(2),
    trialsNs: perTrial.map((v) => +v.toFixed(2)),
    sink: totalSink,
  });
  return nsPerOp;
}

// ---- 0) 基准：空循环 ----
bench("noop（循环 + 调用开销基线）", "所有档都要扣掉这一层", () => true);

// ---- 1) 分配（全部经 KEEP 落地，避免逃逸分析消掉分配）----
bench("new SourceRange(doc,i,i+1)", "旧 new Source(doc,i) 的对应物；经 KEEP 强制落地", (i) => {
  const at = i % 100000;
  const obj = new SourceRange(doc, at, at + 1);
  KEEP[i & 1023] = obj;
  return obj.Start >= 0;
});
bench("new Token(null)", "每 token 一次：Token 字段初始化含 new SourceRange()", (i) => {
  const obj = new Token(null);
  KEEP[i & 1023] = obj;
  return obj.LastIndex < 0;
});
bench("new BlockToken(null)", "BlockToken 字段初始化（Temp/HasBackslash + Token 的 11 个字段）", (i) => {
  const obj = new BlockToken(null);
  KEEP[i & 1023] = obj;
  return obj.HasBackslash === false;
});
bench("SourceRange.Whole(doc)", "热路径里当『窗口外也要读字符』的兜底，每次都 new", (i) => {
  const obj = SourceRange.Whole(doc);
  KEEP[i & 1023] = obj;
  return obj.End > 0;
});

// ---- 2) 读字符 ----
const win = windows[0];
bench("window.At(i)  窗口内（真值）", "驱动层主路径：Has 判定 + Document.GetValue", (i) => win.At(win.Start + (i % windowSize)) !== "\0");
bench("window.Has(i) 窗口内（真）", "At 里的第一跳，独立量", (i) => win.Has(win.Start + (i % windowSize)) === true);
bench("window.Has(i) 窗口外（假）", "窗口边界上每个 transit 都会撞到这一支", () => win.Has(win.Start - 1) === true);
bench("doc.GetValue(i) 直调", "At 的第二跳：TextDocument 的闭包 (index)=>content[index]", (i) => doc.GetValue(i % count) !== "\0");
bench("whole.At(i) 全文档", "不带窗口约束的读字符（兜底路径）", (i) => whole.At(i % count) !== "\0");

// ---- 3) token 生命周期 ----
const tok = new Token(null);
bench("token.SignIn(i)", "含把 Start 复位成 -1（否则会抛）", (i) => {
  tok.SourceRange.Start = -1;
  return tok.SignIn(i % count) !== null;
});
bench("token.SignOut(i)", "含把 End 复位成 -1；Data 为空，不递归", (i) => {
  tok.SourceRange.End = -1;
  tok.SignOut(i % count);
  return true;
});

// ---- 4) 形状分派 ----
const cache = new ItemSlotCache();
class SomeShape {}
const inst = new SomeShape();
cache.SetState(SomeShape.name, { at: 0 });
bench("cache.GetState(this.constructor.name)", "每字符一次候选判定的入口", () => cache.GetState(inst.constructor.name) !== null);
bench("this.constructor.name", "GetState 的键其实每次都要重新取一次字符串", () => inst.constructor.name.length > 0);

// ---- 5) 驱动循环：每字符下限（这一条才能乘回 ms）----
// 与 UnitToken.Process 的内层同形：一个窗口内逐字符 At，直到 End。
function driveWholeRange() {
  const start = process.hrtime.bigint();
  let chars = 0;
  let sink = 0;
  const end = whole.End;
  for (let i = 0; i < end; i++) {
    sink += whole.At(i) === "\0" ? 1 : 0;
    chars++;
  }
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  return { ms, chars, sink };
}
const driveTrials = [];
for (let t = 0; t < trials; t++) {
  driveWholeRange(); // 暖
  const r = driveWholeRange();
  driveTrials.push((r.ms * 1e6) / r.chars);
}
results.push({
  label: "驱动下限：while (i<End) { whole.At(i++) }",
  note: "一次内联循环里逐字符读，等于 UnitToken.Process 的读字符部分（不含 transit 分派）",
  nsPerOp: +median(driveTrials).toFixed(2),
  trialsNs: driveTrials.map((v) => +v.toFixed(2)),
  sink: count,
});

// 窗口版本：每 32 字符换一个 buffer，包含 `index < buffer.End` 的边界判定。
const winDrive = [];
for (let t = 0; t < trials; t++) {
  const run = () => {
    const start = process.hrtime.bigint();
    let sink = 0;
    let chars = 0;
    for (const buffer of windows) {
      for (let i = buffer.Start; i < buffer.End; i++) {
        sink += buffer.At(i) === "\0" ? 1 : 0;
        chars++;
      }
    }
    return { ms: Number(process.hrtime.bigint() - start) / 1e6, chars, sink };
  };
  run();
  const r = run();
  winDrive.push((r.ms * 1e6) / r.chars);
}
results.push({
  label: "驱动下限：按 32 字符窗口 while (i<buffer.End)",
  note: "加上窗口边界判定与每窗口一次 SourceRange 分配，等于 SyntaxContext.Process 的外层",
  nsPerOp: +median(winDrive).toFixed(2),
  trialsNs: winDrive.map((v) => +v.toFixed(2)),
  sink: count,
});

const noop = results[0].nsPerOp;
for (const r of results) r.nsMinusNoop = +(r.nsPerOp - noop).toFixed(2);

const report = {
  mode: "micro",
  node: process.version,
  trials,
  document: { file: "lib.dom.d.ts", chars: count, windowSize, windows: windows.length },
  noopNs: noop,
  rows: results,
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const lines = [];
  lines.push(`node ${process.version}  trials=${trials}  文档 lib.dom.d.ts 前 ${count} 字符，窗口 ${windows.length} 个（${windowSize} 字符/窗口）`);
  lines.push("");
  lines.push(`${"操作".padEnd(46)} ${"ns/次".padStart(9)} ${"扣 noop".padStart(9)}`);
  for (const r of results) {
    lines.push(`${r.label.padEnd(46)} ${String(r.nsPerOp).padStart(9)} ${String(r.nsMinusNoop).padStart(9)}`);
  }
  lines.push("");
  lines.push("说明（note）：");
  for (const r of results) lines.push(`  ${r.label}\n      ${r.note}`);
  console.log(lines.join("\n"));
}
