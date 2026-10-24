// tests/body-drive/stream-proof.mjs — 证明语句块是**真流式**，不是闭合后批处理。
//
//   node tests/body-drive/stream-proof.mjs
//   node tests/body-drive/stream-proof.mjs --verbose
//
// 验收口径（docs/refactor/stream-mount-feasibility.md §5.1）：
//   1. `{` 创建时（`BracketHook` 里）宿主被挂上，且此刻 `bracket.Data.length === 0`
//      —— 挂载早于块内第一个单元的关闭；
//   2. 块内 item 用 `StatementItemRule.Build` 在**解析期**建出：建出时刻的 `context.Index`
//      严格小于该块 `SourceRange.End`（即 `}` 还没关闭）；
//   3. 每个「能流式」的块至少有 1 条这样的 item；
//   4. 判定闸的反面：对象 / 类型字面量、class 体、方法体、switch 体一律不挂。
//
// **已知边界（本波实测，不是缺陷）**：`StatementItemScan` 对「表达式起头」的语句返回 `Mismatch`
// （`StatementItemRule.Classify` 因此不认领，见 statement-item-rule 的 `Classify` 注释），
// 所以整块只有表达式语句时（`{ a = 2; }` / `{ g(); }`）该块**不流式**：引擎记 raw 回退，
// `BuildBlock` 的旧循环逐条建——AST 与流式块走的是同一条建造器，结果等价。
// 因此每个用例同时写明 `expectStreaming`（解析期建出 item 的块数）与 `expectLegacy`
// （回退到旧循环的块数），两个方向都被钉住。
//
// 全部用运行时打桩（Hook / StatementItemRule.Build），不改源码；退出即还原。

import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
if (verbose) args.splice(args.indexOf("--verbose"), 1);
if (args.length > 0) {
  console.error(`未知参数: ${args.join(" ")}`);
  process.exit(2);
}

const { SourceFileRunner } = require(path.join(root, "build/ts/typescript/run/source-file-runner.js"));
const { StatementBlockStream } = require(path.join(root, "build/ts/typescript/run/statement-block-stream.js"));
const { StatementItemRule } = require(path.join(root, "build/ts/typescript/tokens/items/statement-item-rule.js"));

// ---------------------------------------------------------------------------
// 语料：每个用例写明「该挂几个块」「其中几个真流式」「几个回退旧循环」
// ---------------------------------------------------------------------------
const CASES = [
  {
    name: "block-and-if",
    // f 体（let / if / return → 流式）+ if 体（只有 `a = 2;` → 回退）
    expectMounts: 2,
    expectStreaming: 1,
    expectLegacy: 1,
    source: `function f() {
  let a = 1;
  if (a) { a = 2; }
  return a;
}`,
  },
  {
    name: "negatives-and-try",
    // g 体（switch / try / let → 流式）；try / catch / finally 体只有 `g();`（回退）
    // 不许挂：对象字面量、类型字面量、class 体、方法体、switch 体、数组里的对象字面量
    expectMounts: 4,
    expectStreaming: 1,
    expectLegacy: 3,
    source: `let o = { a: 1 };
let t: { x: number } = o;
class C { m() { return 1; } }
function g() {
  switch (o.a) { case 1: break; default: break; }
  try { g(); } catch (e) { g(); } finally { g(); }
  let arr = [ { b: 2 } ];
}`,
  },
  {
    name: "nested-depth",
    // h 体（if → 流式）+ if 体（while → 流式）+ while 体（`g();` → 回退）
    expectMounts: 3,
    expectStreaming: 2,
    expectLegacy: 1,
    source: `function h(x, y) { if (x) { while (y) { g(); } } }`,
  },
  {
    name: "arrow-body",
    // f 体（const / return）+ 箭头体（if / return）+ 箭头体里的 if 体（return）
    expectMounts: 3,
    expectStreaming: 3,
    expectLegacy: 0,
    source: `function f() {
  const k = (a) => { if (a) { return 1; } return 2; };
  return k;
}`,
  },
];

// ---------------------------------------------------------------------------
// 打桩：mounts / builds
// ---------------------------------------------------------------------------
let mounts = [];
let builds = [];

const originalHook = StatementBlockStream.Hook;
StatementBlockStream.Hook = function (bracket, host, context) {
  const before = bracket.BatchAdapter;
  originalHook.call(StatementBlockStream, bracket, host, context);
  if (bracket.BatchAdapter !== before && bracket.BatchAdapter !== null) {
    mounts.push({
      bracket,
      host,
      at: context.Index,
      dataLen: bracket.Data.length,
      adapter: bracket.BatchAdapter.constructor.name,
    });
  }
};

const originalBuild = StatementItemRule.prototype.Build;
StatementItemRule.prototype.Build = function (host, state, context) {
  const item = originalBuild.call(this, host, state, context);
  if (item !== null) {
    builds.push({ host, at: context.Index, item });
  }
  return item;
};

// ---------------------------------------------------------------------------
// 断言
// ---------------------------------------------------------------------------
let pass = 0;
let fail = 0;
const failures = [];

function check(ok, label, detail) {
  if (ok) {
    pass++;
    if (verbose) {
      console.log(`  PASS ${label}${detail ? "  " + detail : ""}`);
    }
    return;
  }
  fail++;
  failures.push(`${label}${detail ? "  " + detail : ""}`);
  console.log(`  FAIL ${label}${detail ? "  " + detail : ""}`);
}

console.log("stream-proof: 语句块真流式（item 在解析期建出）");
console.log(`enabled=${StatementBlockStream.Enabled}`);

for (const testCase of CASES) {
  mounts = [];
  builds = [];
  console.log(`\n## ${testCase.name}  mounts=${testCase.expectMounts} streaming=${testCase.expectStreaming} legacy=${testCase.expectLegacy}`);
  let rootShape = null;
  try {
    rootShape = SourceFileRunner.Parse(testCase.source, `${testCase.name}.ts`);
  } catch (e) {
    check(false, `${testCase.name}: 解析成功`, String(e && e.message ? e.message : e));
    continue;
  }
  check(rootShape !== null, `${testCase.name}: 解析成功`);
  check(
    mounts.length === testCase.expectMounts,
    `${testCase.name}: 挂载块数 = ${testCase.expectMounts}`,
    `实际 ${mounts.length}`,
  );
  let streaming = 0;
  let legacy = 0;
  for (const mount of mounts) {
    const bracket = mount.bracket;
    // 1. 挂载时刻块内还没有任何单元：早于块内第一个单元关闭
    check(
      mount.dataLen === 0,
      `${testCase.name}: 挂载时 Data 为空`,
      `@${bracket.SourceRange.Start} dataLen=${mount.dataLen}`,
    );
    check(
      mount.adapter === "StatementBodyItemHost",
      `${testCase.name}: 适配器是 StatementBodyItemHost`,
      mount.adapter,
    );
    const inside = builds.filter((b) => b.host === bracket);
    const beforeClose = inside.filter((b) => b.at < bracket.SourceRange.End);
    if (inside.length > 0) {
      streaming++;
      // 2. 解析期建出的 item：建出时刻的游标严格在 `}` 之前
      check(
        beforeClose.length > 0 && beforeClose.length === inside.length,
        `${testCase.name}: 块内 item 都在解析期建出`,
        `built=${inside.length} beforeClose=${beforeClose.length} end=${bracket.SourceRange.End}`,
      );
      // 3. 这些 item 已经进 Data（非 basic / 非 trivia）
      const items = bracket.Data.filter((u) => !u.IsBasicToken && !u.IsTriviaToken);
      check(
        items.length > 0,
        `${testCase.name}: 块 Data 里已有 item token`,
        `items=${items.length} data=${bracket.Data.length}`,
      );
    } else {
      legacy++;
    }
    if (verbose) {
      const src = testCase.source.slice(bracket.SourceRange.Start, bracket.SourceRange.End);
      const items = bracket.Data.filter((u) => !u.IsBasicToken && !u.IsTriviaToken).length;
      console.log(
        `  mount @${bracket.SourceRange.Start}..${bracket.SourceRange.End} host=${mount.host.constructor.name}`
        + ` items=${items} built=${inside.length} beforeClose=${beforeClose.length}`
        + `  ${JSON.stringify(src.slice(0, 40))}`,
      );
    }
  }
  check(
    streaming === testCase.expectStreaming,
    `${testCase.name}: 真流式块数 = ${testCase.expectStreaming}`,
    `实际 ${streaming}`,
  );
  check(
    legacy === testCase.expectLegacy,
    `${testCase.name}: 回退旧循环块数 = ${testCase.expectLegacy}`,
    `实际 ${legacy}`,
  );
  // 4. 反面：不该挂的位置一个都没挂（挂载点的块头都不是 switch / 表达式位）
  for (const mount of mounts) {
    const before = testCase.source.slice(0, mount.bracket.SourceRange.Start);
    let head = before.slice(Math.max(0, before.lastIndexOf(";") + 1));
    const brace = head.lastIndexOf("{");
    if (brace >= 0) {
      head = head.slice(brace + 1);
    }
    head = head.trim();
    check(
      !head.includes("switch"),
      `${testCase.name}: switch 体不挂`,
      `mount=@${mount.bracket.SourceRange.Start} head=${JSON.stringify(head.slice(0, 40))}`,
    );
    check(
      !/=\s*$/.test(head) && !head.endsWith(",") && !head.endsWith("[") && !head.endsWith("("),
      `${testCase.name}: 对象 / 类型字面量不挂`,
      `mount=@${mount.bracket.SourceRange.Start} head=${JSON.stringify(head.slice(0, 40))}`,
    );
    check(
      !/\b(class|interface|enum)\b/.test(head),
      `${testCase.name}: class / interface / enum 体不挂`,
      `mount=@${mount.bracket.SourceRange.Start} head=${JSON.stringify(head.slice(0, 40))}`,
    );
  }
}

// 还原打桩（同进程里后面的测试不该看到它们）
StatementBlockStream.Hook = originalHook;
StatementItemRule.prototype.Build = originalBuild;

console.log(`\nPASS ${pass} / FAIL ${fail}（${CASES.length} 段语料）`);
if (fail > 0) {
  console.log("失败项：");
  for (const line of failures) {
    console.log(`  - ${line}`);
  }
  process.exit(1);
}
