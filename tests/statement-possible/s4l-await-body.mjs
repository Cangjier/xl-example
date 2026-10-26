// Stage 4l：块体目录里 `await` 起点语句的接管证据（可复用探针）。
//
//   node tests/statement-possible/s4l-await-body.mjs
//
// 每条源码断言：接管档不抛错、不触发文件级 fallback、XML==legacy（EnableShellExpressions=false）、
// 两次接管档 XML 相同、XML 里没有 StatementShape 壳泄漏，并打印 mount / body / await 计数增量。
// want* 为 null 表示「不断言该计数」（XML==legacy 仍必须成立）——用于未接管面与陷阱组。
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const root = process.cwd();
const load = (p) => require(path.join(root, "build/ts", p));
const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
const { StatementRouteUtil: R } = load("typescript/tokens/statements/statement-route-util.js");
const { BlockPossibleShape: B } = load("typescript/tokens/statements/block-possible-shape.js");

const cases = [
  { name: "async 体首句 await（Stage 4l 接管）", source: "async function a(){ await f(); }", mount: 1, body: 1, awaitShell: 1 },
  { name: "async 体 await + let（壳 detach 回 raw：body 0，XML==legacy）", source: "async function b(){ await f(); let x=1; }", mount: 1, body: 0, awaitShell: 1 },
  { name: "async 体 let + await", source: "async function c(){ let x=1; await f(); }", mount: 1, body: 2, awaitShell: 1 },
  { name: "async 体带返回类型", source: "async function d(): Promise<void> { await f(); }", mount: 1, body: 1, awaitShell: 1 },
  { name: "根层块内 await", source: "{ await f(); }", mount: 0, body: 1, awaitShell: 1 },
  { name: "嵌套块内 await（内层块壳 + await 壳各计一条）", source: "{ { await f(); } }", mount: 0, body: 2, awaitShell: 1 },
  { name: "函数体内嵌套块 await（内层块壳 + await 壳各计一条）", source: "async function h(){ { await f(); } }", mount: 1, body: 2, awaitShell: 1 },
  { name: "await 后 ASI 无分号", source: "async function e(){ await f()\n let x=1; }", mount: 1, body: null, awaitShell: null },
  { name: "裸 await 标识符语句", source: "async function f(){ await; }", mount: 1, body: null, awaitShell: null },
  { name: "名为 await 的标签（同步函数）", source: "function g(){ await: 1; }", mount: 1, body: null, awaitShell: null },
  { name: "两条 await（第二条起 detach 回 raw：body 0，XML==legacy）", source: "async function i(){ await f(a,b); await (c); }", mount: 1, body: 0, awaitShell: 1 },
  { name: "未覆盖：对象方法体", source: "const o = { m(){ await f(); } };", mount: 1, body: 1, awaitShell: 1 },
  { name: "未覆盖：箭头块体", source: "const p = async () => { await f(); };", mount: 1, body: 1, awaitShell: 1 },
  { name: "未覆盖：if 体块", source: "async function q(){ if (a) { await f(); } }", mount: 1, body: null, awaitShell: null },
  { name: "未覆盖：for await 体块", source: "async function r(){ for await (const x of y) { await x; } }", mount: null, body: null, awaitShell: null },
  { name: "陷阱：根层顶层 await", source: "await f();", mount: 0, body: 0, awaitShell: 0 },
  { name: "陷阱：对象字面量键 await", source: "const t = { await: 1 };", mount: 0, body: 0, awaitShell: 0 },
  { name: "陷阱：非 async 函数体 await", source: "function s(){ await f(); }", mount: 1, body: null, awaitShell: null },
  { name: "陷阱：await 后接二目运算", source: "async function u(){ await a + b; let z=1; }", mount: 1, body: null, awaitShell: null },
];

function snapshot() {
  return {
    mount: B.FunctionBodyMountCount, body: R.BlockBodyStatementCount, shell: R.BlockShellCount,
    awaitShell: R.AwaitShellCount, fallback: R.FileFallbackCount,
  };
}
function parseWith(flag, source) {
  R.EnableShellExpressions = flag;
  const before = snapshot();
  const shape = SourceFileRunner.Parse(source, "case.ts");
  const after = snapshot();
  return {
    xml: shape.ToAstLine(0),
    delta: {
      mount: after.mount - before.mount, body: after.body - before.body, shell: after.shell - before.shell,
      awaitShell: after.awaitShell - before.awaitShell, fallback: after.fallback - before.fallback,
    },
  };
}

let failed = 0;
const rows = [];
for (const item of cases) {
  const takeover = parseWith(true, item.source);
  const again = parseWith(true, item.source);
  const legacy = parseWith(false, item.source);
  R.EnableShellExpressions = true;
  const problems = [];
  if (takeover.delta.fallback !== 0) problems.push("触发了文件级 fallback");
  if (takeover.xml !== legacy.xml) problems.push("XML != legacy");
  if (takeover.xml !== again.xml) problems.push("两次接管档 XML 不同");
  if (/StatementShape  /.test(takeover.xml)) problems.push("壳节点泄漏");
  if (item.mount !== null && takeover.delta.mount !== item.mount) problems.push(`mount=${takeover.delta.mount} 期望 ${item.mount}`);
  if (item.body !== null && takeover.delta.body !== item.body) problems.push(`body=${takeover.delta.body} 期望 ${item.body}`);
  if (item.awaitShell !== null && takeover.delta.awaitShell !== item.awaitShell) problems.push(`await=${takeover.delta.awaitShell} 期望 ${item.awaitShell}`);
  const ok = problems.length === 0;
  if (!ok) failed += 1;
  rows.push({
    name: item.name, source: item.source, mount: takeover.delta.mount, body: takeover.delta.body,
    awaitShell: takeover.delta.awaitShell, shell: takeover.delta.shell, ok, problems,
  });
  console.log(`${ok ? "PASS" : "FAIL"}  ${JSON.stringify(item.source)}  mount=${takeover.delta.mount} body=${takeover.delta.body} await=${takeover.delta.awaitShell} shells=${takeover.delta.shell}${ok ? "" : "  <- " + problems.join("; ")}`);
}
console.log(`\n[s4l-await-body] cases=${cases.length} failed=${failed}`);

console.log("\n| 源码 | mount | 已收集 body | await 壳 | 结果 |");
console.log("|---|---|---|---|---|");
for (const row of rows) {
  console.log(`| \`${row.source.replace(/\|/g, "\\|").replace(/\n/g, "\\n")}\` | ${row.mount} | ${row.body} | ${row.awaitShell} | ${row.ok ? "PASS" : "FAIL"} |`);
}
process.exit(failed === 0 ? 0 : 1);