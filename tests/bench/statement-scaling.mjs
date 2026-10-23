// 语句体标度门禁（新增文件，不改任何既有测试与期望值）。
//
// 为什么需要它：`class-scaling.mjs` 只覆盖「class/interface 成员体」；重构的下半场是
// 「if / 块 / 函数 / module 语句 body」的批量 item 表。.d.ts 语料里语句数与单语句长度都很小，
// 既有门禁抓不到语句路径上的 O(L²) 与「批量驱动退化成 per-token」两类回归，故补这一条。
//
// 用法：
//   node tests/bench/statement-scaling.mjs                          # 只测标度（测 ./build）
//   node tests/bench/statement-scaling.mjs --build build --rounds 15 --json
//   node tests/bench/statement-scaling.mjs --base ..\baseline-build\build   # 额外做：同规模 new/base 比 + XML 等价
//
// 判定口径（与阈值一起写死在这里，改阈值必须同时改这段注释）：
//   统计量：每档先 --warmup 次预热（默认 2，不计时），再取 --rounds 次的中位数（默认 15）。
//   档 1（函数体语句数 N=250/500/1000/2000）
//   档 2（module 根级语句数 N=250/500/1000/2000）
//   档 3（单条长表达式语句 token 数 T=250/500/1000/2000）
//   档 4（单条长 if 头 token 数 T=250/500/1000/2000）
//   档 5（嵌套块深度 D=125/250/500/1000）
//         —— 每档相邻翻倍「逐轮配对比值的中位」< **2.6**（线性形态实测 1.3~2.1；二次形态 3.5~4.1）。
//            上一档 median < 2ms 的档位被固定开销主导，该对倍数不作断言（与 class-scaling 同一口径）。
//   给了 --base 时：
//     a) 同规模阈值：每条合成用例的 new/base 逐轮配对比值中位 <= **1.10**（TEAM.md §7 的「±5% 噪声」留一倍余量）；
//        基准档 median < 2ms 时跳过并标 below-floor。
//     b) XML 等价：语句语料 + 全部合成大用例，两份 build 的 XML 必须逐字节一致（或两侧同一条错误消息）。
//
//   确定性：源文本固定合成，不用随机数，不写文件（--json 只走 stdout），不读网络。
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
const ratioLimit = Number(take("--ratio-limit", "1.10"));
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
const IDS = "abcdefghijklmnopqrstuvwxyz";
function ident(i) {
  let s = "";
  let n = i;
  do {
    s = IDS[n % 26] + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  // 前缀 `v`：不留前缀时 bijective base-26 会生成保留字（i=248 → `in` → `let in = 248;`），
  // 当前解析器与 baseline 构建都会在「表达式没有读完」上崩（与本重构无关）。加前缀后语料恒可解析。
  return "v" + s;
}
// 档 1：函数体语句数 N
function stmtCountSource(n) {
  const lines = ["function f() {"];
  for (let i = 0; i < n; i++) lines.push(`  let ${ident(i)} = ${i};`);
  lines.push("}");
  return lines.join("\n") + "\n";
}
// 档 2：module 根级语句数 N（根级 item 表，不是函数体）
function rootStmtCountSource(n) {
  const lines = [];
  for (let i = 0; i < n; i++) lines.push(`const ${ident(i)} = ${i};`);
  return lines.join("\n") + "\n";
}
// 档 3：单条长表达式语句的 token 数 T
function longStatementSource(t) {
  return "function f() {\n  let x = " + new Array(t).fill("a").join(" + ") + ";\n}\n";
}
// 档 4：单条长 if 头（条件 token 数 T）+ 一条语句
function longIfSource(t) {
  return "function f() {\n  if (" + new Array(t).fill("a").join(" && ") + ") { let b = 1; }\n}\n";
}
// 档 5：嵌套块深度 D（if/块 body 的 item 嵌套与收口）
function blockDepthSource(d) {
  let s = "function f() {\n";
  for (let i = 0; i < d; i++) s += "if (a) {";
  s += "let b = 1;";
  for (let i = 0; i < d; i++) s += "}";
  return s + "\n}\n";
}

// ---------- 语句语料（覆盖 if/块/函数/module 体的判定分支；--base 时逐字节对比）----------
const XML_CORPUS = [
  ["if-else", `if (a) { let b = 1; } else { let c = 2; }`],
  ["if-block", `if (a) { let b = 1; } else if (c) { let d = 2; } else { let e = 3; }`],
  ["dangling-else", `if (a) if (b) { let c = 1; } else { let d = 2; }`],
  ["for", `for (let i = 0; i < 3; i++) { let x = i; }`],
  ["for-in-of", `for (const k in o) { let a = 1; }\nfor (const v of xs) { let b = 2; }`],
  ["while", `while (a) { let b = 1; }`],
  ["do", `do { let a = 1; } while (b);`],
  ["block", `{ let a = 1; let b = 2; }`],
  ["function-body", `function f(a, b = 1, ...c) { let x = 1; if (x) { return x; } }`],
  ["function-asi", `function f() { let a = 1\nlet b = 2 }`],
  ["module", `import a from "m";\nexport const b = 1;`],
  ["switch", `switch (x) { case 1: { let a = 1; break; } default: { let b = 2; } }`],
  ["try", `try { let a = 1; } catch (e) { let b = 2; } finally { let c = 3; }`],
  ["label", `outer: for (;;) { break outer; }`],
  ["asi-triple", `let a = 1\nlet b = 2\nlet c = 3`],
  ["empty", `;;;`],
  ["module-block", `namespace N { export const a = 1; }`],
  ["class-in-block", `{ class C { m() {} } }`],
  ["return-empty", `function f() { return; }`],
  ["nested-blocks", `{ { { let a = 1; } } }`],
];

// ---------- 测量 ----------
// 抗噪设计（与 class-scaling.mjs 保持一致，改一处必须同步另一处）：
//   1) 同一 series 的各档逐轮交错计时，而不是一档跑完再跑下一档；
//   2) 奇偶轮换序，抵消「谁先跑谁占缓存便宜」；
//   3) 倍数用「逐轮比值的中位」（配对比值），不是两个中位相除；
//   4) 每档先 warmup 次预热，再取 rounds 次中位。
function median(values) {
  const s = values.slice().sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function timeParse(runner, text, name) {
  const t0 = process.hrtime.bigint();
  const shape = (runner.runner ?? runner).Parse(text, name);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  if (!shape || !Array.isArray(shape.Data)) throw new Error(`${name}: Parse 未返回带 Data 的 SourceFileShape`);
  return ms;
}
function runSeries(cases, runner) {
  for (const one of cases) for (let i = 0; i < warmup; i++) timeParse(runner, one.text, one.name);
  const samples = cases.map(() => []);
  for (let round = 0; round < rounds; round++) {
    const order = [];
    for (let i = 0; i < cases.length; i++) order.push(round % 2 === 0 ? i : cases.length - 1 - i);
    for (const index of order) {
      samples[index].push(timeParse(runner, cases[index].text, cases[index].name));
    }
  }
  return cases.map((one, index) => ({ ...one, samples: samples[index], medianMs: median(samples[index]) }));
}
function pairedRatio(later, earlier) {
  const values = [];
  const count = Math.min(later.samples.length, earlier.samples.length);
  for (let i = 0; i < count; i++) if (earlier.samples[i] > 0) values.push(later.samples[i] / earlier.samples[i]);
  return values.length === 0 ? Infinity : median(values);
}

const build = {};
build.functionCount = runSeries(
  [250, 500, 1000, 2000].map((n) => ({ n, name: `stmt-count-${n}.ts`, text: stmtCountSource(n) })),
  target,
);
build.rootCount = runSeries(
  [250, 500, 1000, 2000].map((n) => ({ n, name: `root-count-${n}.ts`, text: rootStmtCountSource(n) })),
  target,
);
build.longStatement = runSeries(
  [250, 500, 1000, 2000].map((t) => ({ t, name: `long-stmt-${t}.ts`, text: longStatementSource(t) })),
  target,
);
build.longIf = runSeries(
  [250, 500, 1000, 2000].map((t) => ({ t, name: `long-if-${t}.ts`, text: longIfSource(t) })),
  target,
);
build.blockDepth = runSeries(
  [125, 250, 500, 1000].map((d) => ({ d, name: `block-depth-${d}.ts`, text: blockDepthSource(d) })),
  target,
);
// 合成大用例的统一清单（--base 的同规模比与 XML 等价都围绕它）
function syntheticCases() {
  const out = [];
  for (const n of [250, 500, 1000, 2000]) {
    out.push({ name: `stmt-count-${n}`, text: stmtCountSource(n) });
    out.push({ name: `root-count-${n}`, text: rootStmtCountSource(n) });
  }
  for (const t of [250, 500, 1000, 2000]) {
    out.push({ name: `long-stmt-${t}`, text: longStatementSource(t) });
    out.push({ name: `long-if-${t}`, text: longIfSource(t) });
  }
  for (const d of [125, 250, 500, 1000]) out.push({ name: `block-depth-${d}`, text: blockDepthSource(d) });
  return out;
}

// ---------- 断言 1：标度 ----------
const LIMIT = 2.6;
const NOISE_FLOOR_MS = 2;
const failures = [];
const scalingChecks = [];
function checkScaling(label, rows, keyOf) {
  for (let i = 1; i < rows.length; i++) {
    const ratio = pairedRatio(rows[i], rows[i - 1]);
    const row = { label, from: keyOf(rows[i - 1]), to: keyOf(rows[i]), ratio: Number(ratio.toFixed(2)) };
    scalingChecks.push(row);
    if (rows[i - 1].medianMs < NOISE_FLOOR_MS) {
      row.note = "below-floor";
      continue;
    }
    if (!(ratio < LIMIT)) failures.push(`${label}: ${row.from}→${row.to} 倍数 ${ratio.toFixed(2)} 不小于 ${LIMIT}`);
  }
}
checkScaling("函数体语句数 N", build.functionCount, (r) => `N=${r.n}`);
checkScaling("module 语句数 N", build.rootCount, (r) => `N=${r.n}`);
checkScaling("长表达式语句 T", build.longStatement, (r) => `T=${r.t}`);
checkScaling("长 if 头 T", build.longIf, (r) => `T=${r.t}`);
checkScaling("嵌套块深度 D", build.blockDepth, (r) => `D=${r.d}`);

// ---------- 断言 2：--base 时同规模比 + XML 等价 ----------
let sameScale = null;
let equivalents = null;
if (base !== null) {
  // a) 同规模：逐用例、逐轮 new/base 配对（奇偶轮换序，避免先后便宜）
  sameScale = [];
  const cases = syntheticCases();
  const newSamples = cases.map(() => []);
  const baseSamples = cases.map(() => []);
  for (const one of cases) {
    for (let i = 0; i < warmup; i++) {
      timeParse(target, one.text, one.name);
      timeParse(base, one.text, one.name);
    }
  }
  for (let round = 0; round < rounds; round++) {
    const order = [];
    for (let i = 0; i < cases.length; i++) order.push(round % 2 === 0 ? i : cases.length - 1 - i);
    for (const index of order) {
      const one = cases[index];
      const pairFirstNew = round % 2 === 0;
      const a = timeParse(target, one.text, one.name);
      const b = timeParse(base, one.text, one.name);
      newSamples[index].push(pairFirstNew ? a : b);
      baseSamples[index].push(pairFirstNew ? b : a);
    }
  }
  for (let i = 0; i < cases.length; i++) {
    const newMs = median(newSamples[i]);
    const baseMs = median(baseSamples[i]);
    const row = { name: cases[i].name, newMs, baseMs, ratio: Number((newMs / baseMs).toFixed(2)) };
    sameScale.push(row);
    if (baseMs < NOISE_FLOOR_MS) {
      row.note = "below-floor";
      continue;
    }
    if (!(row.ratio <= ratioLimit)) failures.push(`同规模: ${row.name} new/base = ${row.ratio.toFixed(2)} 超过 ${ratioLimit}`);
  }
  // b) XML 等价（语句语料 + 合成大用例）
  equivalents = [];
  const eqCases = XML_CORPUS.map(([name, source]) => [name, source]);
  for (const one of syntheticCases()) eqCases.push([one.name, one.text]);
  for (const [name, source] of eqCases) {
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
  ratioLimit,
  scaling: build,
  scalingChecks,
  sameScale,
  equivalents,
  failures,
  ok: failures.length === 0,
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const fmt = (ms) => (ms >= 100 ? ms.toFixed(1) : ms.toFixed(2)).padStart(9);
  console.log(
    `语句体标度门禁   build=${buildDir}  warmup=${warmup} rounds=${rounds}  门限=相邻档翻倍倍数 < ${LIMIT}` +
      (base !== null ? `;同规模 new/base <= ${ratioLimit}` : ""),
  );
  const printSeries = (title, rows, key, unit) => {
    console.log(`\n## ${title}`);
    console.log(`  ${unit.padStart(8)} ${"median ms".padStart(10)} ${"倍数".padStart(8)}`);
    for (const row of rows) {
      const ratio = row.ratioVsPrev === undefined ? "-" : `x${row.ratioVsPrev.toFixed(2)}`;
      console.log(`  ${String(row[key]).padStart(8)} ${fmt(row.medianMs)} ${ratio.padStart(8)}`);
    }
  };
  // 把配对倍数回填到 rows，打印用
  for (const row of scalingChecks) {
    for (const series of [build.functionCount, build.rootCount, build.longStatement, build.longIf, build.blockDepth]) {
      const hit = series.find((one) => one.medianMs !== undefined && row.to === `N=${one.n}`);
      if (hit) hit.ratioVsPrev = row.ratio;
    }
  }
  // 上面按 key 回填过于取巧，这里直接按 series 重新算一遍再打印，保证行内倍数与断言一致
  const withRatios = (rows) => rows.map((row, i) => ({ ...row, ratioVsPrev: i === 0 ? undefined : Number(pairedRatio(rows[i], rows[i - 1]).toFixed(2)) }));
  printSeries("档 1：函数体语句数 N", withRatios(build.functionCount), "n", "N");
  printSeries("档 2：module 根级语句数 N", withRatios(build.rootCount), "n", "N");
  printSeries("档 3：单条长表达式语句 token 数 T", withRatios(build.longStatement), "t", "T");
  printSeries("档 4：单条长 if 头 token 数 T", withRatios(build.longIf), "t", "T");
  printSeries("档 5：嵌套块深度 D", withRatios(build.blockDepth), "d", "D");
  console.log(`  （上一档 < ${NOISE_FLOOR_MS}ms 的倍数为 below-floor、不作断言）`);
  if (sameScale !== null) {
    console.log(`\n## 同规模 new/base（门限 <= ${ratioLimit}）`);
    for (const row of sameScale) {
      console.log(`  ${row.name.padEnd(18)} new=${fmt(row.newMs)} base=${fmt(row.baseMs)} x${row.ratio.toFixed(2)}${row.note ? ` (${row.note})` : ""}`);
    }
    console.log(`\n## XML 等价（--base ${baseDir} vs --build ${buildDir}）`);
    for (const row of equivalents) console.log(`  ${row.ok ? "PASS" : "FAIL"} ${row.name.padEnd(18)} ${row.detail}`);
  }
  if (failures.length === 0) {
    console.log(`\nPASS 全部通过（标度 ${scalingChecks.length} 对${equivalents ? `，同规模 ${sameScale.length} 项，等价 ${equivalents.length} 项` : ""}）`);
  } else {
    console.log(`\nFAIL ${failures.length} 项：`);
    for (const failure of failures) console.log(`  - ${failure}`);
  }
}

process.exit(report.ok ? 0 : 1);
