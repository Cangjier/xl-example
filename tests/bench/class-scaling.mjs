// 类体成员判定的标度门禁 + class 密集语料的 XML 等价自检（新增文件，不改任何既有测试与期望值）。
//
// 背景：`ClassMemberPossibleUtil.Scan` 原先每个 token 都 `ItemUtil.ItemStart` 倒扫 + 从 Start 重建
// 整个 code 数组，`Analyze` 每轮 `AngleDepth` + `FindMemberBoundary` 全量重扫 —— 单个成员内 O(L²)。
// .d.ts 语料里几乎没有 class（2954 interface / 10 class），既有门禁抓不到它，故补这一条。
//
// 用法：
//   node tests/bench/class-scaling.mjs                              # 只跑标度（测 ./build）
//   node tests/bench/class-scaling.mjs --build build-class-before   # 测指定产物（改前对照）
//   node tests/bench/class-scaling.mjs --base build-class-before    # 额外做 XML 等价 + 改前/改后 ms
//   node tests/bench/class-scaling.mjs --rounds 15 --warmup 2 --json
//
// 判定口径（与阈值一起写死在这里，改阈值必须同时改这段注释）：
//   统计量：每档先 `--warmup` 次预热（默认 2，不计时），再取 `--rounds` 次的中位数（默认 15）。
//           单档中位数在 15 次采样下的相对波动约 ±3%（7 次时 ±8%，这就是旧版 flaky 的来源）。
//   档 A（成员数  N=250/500/1000/2000）：相邻档「翻倍耗时倍数」< **2.6**
//   档 B（成员长度 T=250/500/1000/2000）：相邻档「翻倍耗时倍数」< **2.6**
//         —— 这一档才是抓 O(L²) 的；计时小于 2ms 的档位被固定开销主导，
//            该对倍数不作断言，改由下面这条更稳的结构性断言守。
//   档 B 结构性断言：每个 T 上 class 的耗时 <= interface 的 **1.8 倍**
//         （interface 是已经合规的增量样板；class 全量重扫时这里是 5.4×~74×）
//   给了 --base 时：class 密集语料 + 两档合成源，两份 build 的 XML（或同一条错误消息）必须逐字节一致
//
//   为什么是 2.6 / 1.8：二次形态实测是 ×3.5~4.1、class/interface 5.4~74×；线性形态实测 ×1.3~2.1、
//   class/interface 0.7~1.4。2.6 与 1.8 落在两个簇之间，既不误报又保留分辨力。
//   回归验证：用改前产物（`m1-tokens-opt/build`，即 class 全量重扫的那版）跑必须稳定 FAIL（实测 10/10）。
//
// 确定性：源文本是固定合成，不用随机数，不写文件（--json 只走 stdout），不读网络。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");

const args = process.argv.slice(2);
function take(flag, fallback) {
  const i = args.indexOf(flag);
  if (i < 0) return fallback;
  const v = args[i + 1];
  if (v === undefined || v.startsWith("--")) throw new Error(`${flag} 需要一个值`);
  args.splice(i, 2);
  return v;
}
const buildDir = take("--build", "build");
const baseDir = take("--base", null);
const rounds = Number(take("--rounds", "15"));
const warmup = Number(take("--warmup", "2"));
const asJson = args.includes("--json");
if (args.includes("--json")) args.splice(args.indexOf("--json"), 1);
if (args.length > 0) {
  console.error(`未知参数: ${args.join(" ")}`);
  process.exit(2);
}
if (!Number.isInteger(rounds) || rounds < 15) throw new Error(`--rounds 至少 15（15 次中位的相对波动约 ±3%），收到 ${rounds}`);
if (!Number.isInteger(warmup) || warmup < 0) throw new Error(`--warmup 必须是非负整数，收到 ${warmup}`);

function loadRunner(dir, label) {
  const full = path.resolve(root, dir);
  const entry = path.join(full, "ts", "typescript", "run", "source-file-runner.js");
  if (!fs.existsSync(entry)) throw new Error(`找不到 ${label} build: ${entry}（先构建，或指对 --build/--base 目录）`);
  const mod = require(entry);
  if (!mod || !mod.SourceFileRunner || typeof mod.SourceFileRunner.Parse !== "function") {
    throw new Error(`${label} build 的 SourceFileRunner.Parse 不可用: ${entry}`);
  }
  return { dir, runner: mod.SourceFileRunner };
}

const target = loadRunner(buildDir, "--build");
const base = baseDir === null ? null : loadRunner(baseDir, "--base");

// ---------- 合成源 ----------
// 档 A：成员数 N（每个成员 12 个类型 token，固定长度）
function memberCountSource(n) {
  const lines = ["class C {"];
  for (let i = 0; i < n; i++) {
    lines.push(`  m${i}(a: A | B | C | D | E | F, b: G | H | I | J): K | L | M | N { return; }`);
  }
  lines.push("}");
  return lines.join("\n") + "\n";
}
// 档 B：单个成员的长度 T（类型联合的 token 数）—— 抓「成员内 O(L²)」
function memberLengthSource(t) {
  const type = new Array(t).fill("A").join(" | ");
  return `class C {\n  p: ${type};\n}\n`;
}

// 档 B 的同一段文本放进 interface，作为「增量样板」的参照（不参与断言，只打印对照）
function interfaceLengthSource(t) {
  const type = new Array(t).fill("A").join(" | ");
  return `interface I {\n  p: ${type};\n}\n`;
}

// ---------- class 密集 XML 语料（覆盖 class 体判定的各个分支）----------
const XML_CORPUS = [
  // 基础成员种类
  ["member-kinds", `class C {
  a = 1;
  b: A;
  readonly c?: B;
  static d!: C;
  private e = 2
  protected f: F
  public static readonly g = 3;
  #h = 4;
  "i" = 5;
  0 = 6;
  [k] = 7;
  constructor(x: number) { this.a = x; }
  m(): void {}
  n?<T>(x: T): T { return x; }
  *gen(): void {}
  async am(): Promise<void> {}
  get acc(): A { return this.b; }
  set acc(v: A) { this.b = v; }
  static { this.a = 1; }
  [key: string]: A;
  ;
}`],
  // 修饰词链 + ASI 边界（class 体判据里最容易切错的地方）
  ["modifier-asi", `class C {
  public static
  readonly a = 1;
  static
  m() {}
  get
  x(): A { return this.a; }
  async
  y(): void {}
  override
  z(): void {}
}`],
  // 换行后的 ( / < 是上一行初始化器的续接，不是新成员
  ["continuation", `class C {
  a = foo
  (x);
  b = bar
  <T>(x);
  c = baz
  [0];
  d = qux
  \`t\`;
}`],
  // 装饰器成员
  ["decorators", `class C {
  @dec m() {}
  @a @b.c(x) n() {}
  @new Foo() x = 1;
  @(expr) y: A;
}`],
  // 同一行多条（带分号，合法形态）+ 紧凑写法
  ["compact", `class C { a = 1; b = 2; m() {} n() {} }`],
  // 同一行多条且无分号（TS 也是错误恢复形：两侧必须给同一条错误）
  ["same-line", `class C {
  a = 1 b = 2
  c: A d: B
  m() {} n() {}
  /* 注释 */ e = 3; // 行尾
}`],
  // 长成员 + 成员内 <...> 深度（收口证据必须被角深度压住）
  ["long-members", `class C {
  p: Foo<Bar<Baz<Qux>>>;
  q: A | B | C | D | E | F | G | H;
  m<T extends A | B>(x: T): Foo<T> {}
  n: Record<string, Array<Map<A, B>>>;
}`],
  // 空类与只有分号
  ["empty", `class C {}`],
  ["only-semicolons", `class C { ; ; ; }`],
];

// ---------- 测量 ----------
// 抗噪设计（这是「连跑 10 次 0 误报」的关键）：
//   1) 同一条 series 里的各档**逐轮交错**计时，而不是「把一档跑完再跑下一档」——
//      后者会让不同档落在不同的 GC/预热相位上，倍数被相位差污染（旧版 flaky 的主因之一）；
//   2) 奇偶轮**换序**，抵消「谁先跑谁占缓存便宜」；
//   3) 档与档的倍数用「逐轮比值的中位」（配对比值），而不是「两个中位相除」；
//   4) 每档先 warmup 次预热，再取 rounds 次中位。
function median(values) {
  const s = values.slice().sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function runSeries(cases) {
  for (const one of cases) for (let i = 0; i < warmup; i++) target.runner.Parse(one.text, one.name);
  const samples = cases.map(() => []);
  for (let round = 0; round < rounds; round++) {
    const order = [];
    for (let i = 0; i < cases.length; i++) order.push(round % 2 === 0 ? i : cases.length - 1 - i);
    for (const index of order) {
      const one = cases[index];
      const t0 = process.hrtime.bigint();
      const shape = target.runner.Parse(one.text, one.name);
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      if (!shape || !Array.isArray(shape.Data)) throw new Error(`${one.name}: Parse 未返回带 Data 的 SourceFileShape`);
      samples[index].push(ms);
    }
  }
  return cases.map((one, index) => ({ ...one, samples: samples[index], medianMs: median(samples[index]) }));
}

// 配对比值：逐轮 (later / earlier) 的中位
function pairedRatio(later, earlier) {
  const values = [];
  const count = Math.min(later.samples.length, earlier.samples.length);
  for (let i = 0; i < count; i++) {
    if (earlier.samples[i] > 0) values.push(later.samples[i] / earlier.samples[i]);
  }
  return values.length === 0 ? Infinity : median(values);
}

const scaling = { memberCount: [], memberLength: [], interfaceLength: [] };
scaling.memberCount = runSeries(
  [250, 500, 1000, 2000].map((n) => ({ n, name: `class-count-${n}.ts`, text: memberCountSource(n) })),
);
// 档 B 与 interface 样板同轮交错：class/interface 比也是同轮配对的
const lengthCases = [];
for (const t of [250, 500, 1000, 2000]) {
  lengthCases.push({ t, kind: "class", name: `class-len-${t}.ts`, text: memberLengthSource(t) });
  lengthCases.push({ t, kind: "iface", name: `iface-len-${t}.ts`, text: interfaceLengthSource(t) });
}
const lengthSeries = runSeries(lengthCases);
scaling.memberLength = lengthSeries.filter((one) => one.kind === "class");
scaling.interfaceLength = lengthSeries.filter((one) => one.kind === "iface");

// ---------- 断言 ----------
const LIMIT = 2.6;
// 计时小于这个值的档位被固定开销（文件级 preamble / GC）主导，倍数不可信，不作断言。
const NOISE_FLOOR_MS = 2;
const INTERFACE_LIMIT = 1.8;
const failures = [];
function checkScaling(label, rows, keyOf, floorMs) {
  for (let i = 1; i < rows.length; i++) {
    const ratio = pairedRatio(rows[i], rows[i - 1]);
    rows[i].ratioVsPrev = Number(ratio.toFixed(2));
    if (floorMs !== undefined && rows[i - 1].medianMs < floorMs) {
      rows[i].ratioNote = "below-floor";
      continue;
    }
    if (!(ratio < LIMIT)) {
      failures.push(`${label}: ${keyOf(rows[i - 1])}→${keyOf(rows[i])} 倍数 ${ratio.toFixed(2)} 不小于 ${LIMIT}`);
    }
  }
}
checkScaling("档 A 成员数", scaling.memberCount, (r) => `N=${r.n}`);
checkScaling("档 B 成员长度", scaling.memberLength, (r) => `T=${r.t}`, NOISE_FLOOR_MS);
// 结构性断言：class 成员判定不该比已经合规的 interface 增量样板慢出一个量级
for (let i = 0; i < scaling.memberLength.length; i++) {
  const cls = scaling.memberLength[i];
  const iface = scaling.interfaceLength[i];
  const ratio = pairedRatio(cls, iface);
  cls.vsInterface = Number(ratio.toFixed(2));
  if (!(ratio <= INTERFACE_LIMIT)) {
    failures.push(`档 B 结构性: T=${cls.t} class/interface = ${cls.vsInterface} 超过 ${INTERFACE_LIMIT}`);
  }
}

// ---------- XML 等价（--base 时）----------
let equivalents = null;
if (base !== null) {
  equivalents = [];
  const cases = XML_CORPUS.map(([name, source]) => [name, source]);
  for (const n of [250, 500, 1000, 2000]) cases.push([`class-count-${n}`, memberCountSource(n)]);
  for (const t of [250, 500, 1000, 2000]) cases.push([`class-len-${t}`, memberLengthSource(t)]);
  for (const [name, source] of cases) {
    const row = { name, ok: false, detail: "" };
    let baseXml = null;
    let baseErr = null;
    try {
      baseXml = base.runner.Parse(source, `${name}.ts`).ToString();
    } catch (error) {
      baseErr = error && typeof error === "object" ? (error.Message ?? error.message ?? String(error)) : String(error);
    }
    let newXml = null;
    let newErr = null;
    try {
      newXml = target.runner.Parse(source, `${name}.ts`).ToString();
    } catch (error) {
      newErr = error && typeof error === "object" ? (error.Message ?? error.message ?? String(error)) : String(error);
    }
    if (baseErr !== null || newErr !== null) {
      if (baseErr === newErr) {
        row.ok = true;
        row.detail = `同一条错误（两侧一致）: ${String(baseErr).slice(0, 80)}`;
      } else {
        row.detail = `错误不一致: base=${String(baseErr).slice(0, 60)} new=${String(newErr).slice(0, 60)}`;
      }
    } else if (baseXml === newXml) {
      row.ok = true;
      row.detail = `XML ${baseXml.length} 字节一致`;
    } else {
      let at = 0;
      const n = Math.min(baseXml.length, newXml.length);
      while (at < n && baseXml[at] === newXml[at]) at++;
      row.detail = `XML 首次差异 @${at}: base=${JSON.stringify(baseXml.slice(at, at + 60))} new=${JSON.stringify(newXml.slice(at, at + 60))}`;
    }
    equivalents.push(row);
    if (!row.ok) failures.push(`等价: ${name} — ${row.detail}`);
  }
}

// ---------- 输出 ----------
const report = {
  build: buildDir,
  base: baseDir,
  rounds,
  warmup,
  limit: LIMIT,
  interfaceLimit: INTERFACE_LIMIT,
  scaling,
  equivalents,
  failures,
  ok: failures.length === 0,
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`class 标度门禁   build=${buildDir}  warmup=${warmup} rounds=${rounds}  门限=相邻档翻倍倍数 < ${LIMIT}、class/interface <= ${INTERFACE_LIMIT}`);
  const fmt = (ms) => (ms >= 100 ? ms.toFixed(1) : ms.toFixed(2)).padStart(9);
  console.log(`\n## 档 A：成员数 N（每成员固定 12 个类型 token）`);
  console.log(`  ${"N".padStart(6)} ${"median ms".padStart(10)} ${"倍数".padStart(8)}`);
  for (const row of scaling.memberCount) {
    console.log(`  ${String(row.n).padStart(6)} ${fmt(row.medianMs)} ${(row.ratioVsPrev === undefined ? "-" : "x" + row.ratioVsPrev.toFixed(2)).padStart(8)}`);
  }
  console.log(`\n## 档 B：单个成员的类型 token 数 T（class 成员判定 vs interface 增量样板）`);
  console.log(`  ${"T".padStart(6)} ${"class ms".padStart(10)} ${"倍数".padStart(8)} ${"interface ms".padStart(14)} ${"class/iface".padStart(12)}`);
  for (let i = 0; i < scaling.memberLength.length; i++) {
    const row = scaling.memberLength[i];
    const iface = scaling.interfaceLength[i];
    const ratio = row.ratioVsPrev === undefined ? "-" : row.ratioNote === "below-floor" ? `x${row.ratioVsPrev.toFixed(2)}·` : `x${row.ratioVsPrev.toFixed(2)}`;
    console.log(
      `  ${String(row.t).padStart(6)} ${fmt(row.medianMs)} ${ratio.padStart(8)} ${fmt(iface.medianMs).padStart(14)} ${("x" + row.vsInterface.toFixed(2)).padStart(12)}`,
    );
  }
  console.log(`  （倍数带 · = 上一档 < ${NOISE_FLOOR_MS}ms，被固定开销主导、不作断言；结构性门限 class/iface <= ${INTERFACE_LIMIT}）`);
  if (equivalents !== null) {
    console.log(`\n## XML 等价（--base ${baseDir} vs --build ${buildDir}）`);
    for (const row of equivalents) console.log(`  ${row.ok ? "PASS" : "FAIL"} ${row.name.padEnd(18)} ${row.detail}`);
  }
  if (failures.length === 0) {
    console.log(`\nPASS 全部通过（标度 ${scaling.memberCount.length + scaling.memberLength.length} 档${equivalents ? `，等价 ${equivalents.length} 项` : ""}）`);
  } else {
    console.log(`\nFAIL ${failures.length} 项：`);
    for (const failure of failures) console.log(`  - ${failure}`);
  }
}

process.exit(report.ok ? 0 : 1);
