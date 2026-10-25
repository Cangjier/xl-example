#!/usr/bin/env node
// throw 语句的形状层存活探针（possible-statement cleanup-throw 轮）。
//
// 本探针回答一个问题：**删掉 throw 的两个未实现 possible shape 桩（statement / keyword 各一）
// 之后，`throw` 三形态的解析行为有没有变**。它的判据全是行为面的，
// 不含任何"桩文件在不在"的断言 —— 所以同一份断言在删桩前后都必须通过，
// 这正是"删除不改变行为"的取证方式。
//
// 三形态（每条都从"默认态"与"legacy 态"两个开关各投一遍）：
//   1. `throw a;`                  —— 普通表达式被抛。
//   2. `throw new Error("x");`     —— `new` 表达式被抛。
//   3. `throw\nx`                  —— 受限产生式 ASI：`throw` 后不许换行，TS 读成
//                                     `throw;`（缺表达式）+ `x;` 两条语句；本仓必须逐节点相同。
//
// 每条断言：
//   a) 解析不抛异常；
//   b) AST 逐节点（kind / pos / end / text，按前序展开）与 `ts.createSourceFile` 完全一致；
//   c) 顶层的语句 kind 序列与预期一致（`throw\nx` 必须是两条语句，不能被粘成一条）；
//   d) 没有文件级 fallback（`FileFallbackCount === 0`）；
//   e) 两个开关档（壳开 / legacy）的 AST 与 XML 逐字节相同 —— 删掉的桩本来就不在候选表里
//      （唯一引用是注释行），所以两档本来就都走同一条语句路径。
//
// 用法：node tests/statement-possible/throw-shape-alive.mjs [--verbose]
// 退出码：0 = 全部通过；1 = 有失败。依赖：先 `xl_build` 再 `tsc`（读 build/ts）。
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createAstCore, cjAst } from "../../typescript/cases/ast-compare.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const require = createRequire(import.meta.url);
const ts = require(path.join(root, "node_modules", "typescript"));
const { tsAst } = createAstCore(ts);
const load = (rel) => require(path.join(root, "build", "ts", rel));

const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
const { StatementRouteUtil } = load("typescript/tokens/statements/statement-route-util.js");

const verbose = process.argv.includes("--verbose");

/** 每条形如 [名字, 源码, 顶层语句 kind 序列]。 */
const FORMS = [
  ["throw-identifier", "throw a;", ["ThrowStatement"]],
  ["throw-new-expression", 'throw new Error("x");', ["ThrowStatement"]],
  ["throw-asi-newline", "throw\nx", ["ThrowStatement", "ExpressionStatement"]],
];

/** 去掉 TS 的收尾 `EndOfFileToken`（本仓 AST 不带它，ast-compare 的口径）。 */
function stripEof(node) {
  const kids = node.children || [];
  if (kids.length > 0 && kids[kids.length - 1].kind === "EndOfFileToken") kids.pop();
  return node;
}

/** 前序展开成可比数组。 */
function flatten(node, out = []) {
  out.push({ kind: node.kind, pos: node.pos, end: node.end, text: node.text });
  for (const child of node.children || []) flatten(child, out);
  return out;
}

/** 第一处不一致的人类可读描述；完全一致返回 null。 */
function firstDifference(left, right) {
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const a = left[i];
    const b = right[i];
    if (a === undefined || b === undefined) {
      return `节点数不同：本仓 ${left.length} / TS ${right.length}（首个多出处在 #${i}）`;
    }
    for (const key of ["kind", "pos", "end", "text"]) {
      if (a[key] !== b[key]) {
        return `#${i} ${key}：本仓 ${JSON.stringify(a[key])} / TS ${JSON.stringify(b[key])}（kind=${a.kind}）`;
      }
    }
  }
  return null;
}

function parseXml(source) {
  return SourceFileRunner.Parse(source, "throw-shape-alive.ts").ToXmlString();
}

function messageOf(error) {
  let text = "";
  for (let node = error; node; node = node.InnerException || node.innerException) {
    text = String(node.Message || node.message || text);
  }
  return (text.split("\n")[0] || "unknown").trim();
}

const savedShell = StatementRouteUtil.EnableShellExpressions;
const savedFallback = StatementRouteUtil.FileFallbackCount;
let fallbackTotal = 0;

// --- 自检：对拍器本身必须先"看得见"差异，否则全 PASS 是空的 ---
const astOf = (source) => flatten(cjAst(SourceFileRunner.Parse(source, "throw-shape-alive.ts")));
const selfTests = [
  ["identical", firstDifference(astOf("throw a;"), astOf("throw a;")) === null],
  ["text-diff", firstDifference(astOf("throw a;"), astOf("throw b;")) !== null],
  ["count-diff", firstDifference(astOf("throw\nx"), astOf("throw x;")) !== null],
];
const selfFailed = selfTests.filter(([, ok]) => !ok);

const rows = [];
try {
  for (const [name, source, expectedKinds] of FORMS) {
    const problems = [];

    // --- TS 参考答案（与开关无关） ---
    const tsFlat = flatten(
      stripEof(tsAst(ts.createSourceFile("throw-shape-alive.ts", source, ts.ScriptTarget.Latest, true))),
    );

    // --- 两个开关档各投一遍 ---
    const modes = [];
    for (const shell of [true, false]) {
      StatementRouteUtil.EnableShellExpressions = shell;
      StatementRouteUtil.FileFallbackCount = 0;
      const row = { shell, xml: null, flat: null, kinds: null, fallback: 0 };
      try {
        row.xml = parseXml(source);
        row.fallback = StatementRouteUtil.FileFallbackCount;
        const tree = cjAst(SourceFileRunner.Parse(source, "throw-shape-alive.ts"));
        row.flat = flatten(tree);
        row.kinds = (tree.children || []).map((child) => child.kind);
      } catch (error) {
        problems.push(`${shell ? "默认档" : "legacy 档"}解析抛错：${messageOf(error)}`);
      }
      modes.push(row);
    }

    for (const row of modes) {
      if (row.flat === null) continue;
      const label = row.shell ? "默认档" : "legacy 档";
      fallbackTotal += row.fallback;
      if (row.fallback !== 0) {
        problems.push(`${label} FileFallbackCount=${row.fallback}（整条文件回退）`);
      }
      const diff = firstDifference(row.flat, tsFlat);
      if (diff !== null) problems.push(`${label} AST 与 TS 不同：${diff}`);
      if (row.kinds.join(",") !== expectedKinds.join(",")) {
        problems.push(`${label} 顶层语句 kind=${row.kinds.join(",")}（期望 ${expectedKinds.join(",")}）`);
      }
    }

    if (modes.length === 2 && modes[0].xml !== null && modes[1].xml !== null && modes[0].xml !== modes[1].xml) {
      problems.push("两档 XML 不同（壳路径与 legacy 路径应是同一棵树）");
    }

    rows.push({ name, source, expectedKinds, nodes: tsFlat.length, problems, ok: problems.length === 0 });
  }
} finally {
  StatementRouteUtil.EnableShellExpressions = savedShell;
  StatementRouteUtil.FileFallbackCount = savedFallback;
}

const failed = rows.filter((row) => !row.ok);
const lines = [];
for (const [name, ok] of selfTests) lines.push(`${ok ? "PASS" : "FAIL"} self-test ${name}`);
for (const row of rows) {
  lines.push(`${row.ok ? "PASS" : "FAIL"} ${row.name.padEnd(22)} nodes=${row.nodes} :: ${JSON.stringify(row.source)}`);
  if (verbose || !row.ok) {
    lines.push(`     顶层语句：${row.expectedKinds.join(" + ")}`);
    for (const problem of row.problems) lines.push(`     - ${problem}`);
  }
}
lines.push(
  `[throw-shape-alive] cases=${rows.length} pass=${rows.length - failed.length} fail=${failed.length} ` +
    `self-test=${selfTests.length - selfFailed.length}/${selfTests.length} fallback=${fallbackTotal}（两档各投一遍）`,
);
process.stdout.write(lines.join("\n") + "\n");
process.exit(failed.length === 0 && selfFailed.length === 0 ? 0 : 1);
