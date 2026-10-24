// Stage 4j：函数体 / 方法体 / 深层嵌套块的接管证据（可复用探针）。
//
//   node tests/statement-possible/s4j-function-body.mjs
//
// 每条源码断言：接管档不抛错、不触发文件级 fallback、XML==legacy（EnableShellExpressions=false）、
// 两次接管档 XML 相同、XML 里没有 StatementShape 壳泄漏，并打印计数增量。
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const root = process.cwd();
const load = (p) => require(path.join(root, "build/ts", p));
const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
const { StatementRouteUtil: R } = load("typescript/tokens/statements/statement-route-util.js");
const { BlockPossibleShape: B } = load("typescript/tokens/statements/block-possible-shape.js");

const cases = [
  { name: "function 声明体", source: "function f(){ let x=1; if(x) f(); }", wantMount: 1 },
  { name: "function 带返回类型（`{` 前是类型标识符：未覆盖）", source: "function g(a: number): number { let y = a; while (y) f(); return y; }", wantMount: 0 },
  { name: "function 体空", source: "function e(){}", wantMount: 1 },
  { name: "async function 体（await 语句仍走 raw 段）", source: "async function h() { await f(); }", wantMount: 1 },
  { name: "class 方法体+构造器", source: "class C{ m(){ let y=2; while(y) f(); } constructor(){ this.x=1; } }", wantMount: null },
  { name: "对象方法体", source: "const o = { m(){ let z=1; } };", wantMount: null },
  { name: "深层块 3 层裸语句", source: "{ { { a; } } }", wantMount: 0 },
  { name: "深层块 3 层 let", source: "{ { { let x=1; } } }", wantMount: 0 },
  { name: "并列内层块", source: "{ { a; } { b; } }", wantMount: 0 },
  { name: "if 体块（宿主是控制流壳，未覆盖）", source: "if (a) { let x = 1; }", wantMount: 0 },
];

function snapshot() {
  return { mount: B.FunctionBodyMountCount, body: R.BlockBodyStatementCount, shell: R.BlockShellCount, fallback: R.FileFallbackCount };
}
function parseWith(flag, source) {
  R.EnableShellExpressions = flag;
  const before = snapshot();
  const shape = SourceFileRunner.Parse(source, "case.ts");
  const after = snapshot();
  return { xml: shape.ToXmlString(), delta: {
    mount: after.mount - before.mount, body: after.body - before.body,
    shell: after.shell - before.shell, fallback: after.fallback - before.fallback } };
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
  if (/<StatementShape[ >]/.test(takeover.xml)) problems.push("壳节点泄漏");
  if (item.wantMount !== null && takeover.delta.mount !== item.wantMount) problems.push(`mount=${takeover.delta.mount} 期望 ${item.wantMount}`);
  const ok = problems.length === 0;
  if (!ok) failed += 1;
  rows.push({ name: item.name, source: item.source, mount: takeover.delta.mount, body: takeover.delta.body, shell: takeover.delta.shell, ok, problems });
  console.log(`${ok ? "PASS" : "FAIL"}  ${JSON.stringify(item.source)}  mount=${takeover.delta.mount} body=${takeover.delta.body} shells=${takeover.delta.shell}${ok ? "" : "  <- " + problems.join("; ")}`);
}
console.log(`\n[s4j-function-body] cases=${cases.length} failed=${failed}`);

// 供 HANDOFF 引用的读数表（脚本直接写进交接文档，数字来自本次实测）。
console.log("\n| 源码 | mount 增量 | 已收集语句 body 增量 | 块壳 shell 增量 | 结果 |");
console.log("|---|---|---|---|---|");
for (const row of rows) {
  console.log(`| \`${row.source.replace(/\|/g, "\\|")}\` | ${row.mount} | ${row.body} | ${row.shell} | ${row.ok ? "PASS" : "FAIL"} |`);
}
process.exit(failed === 0 ? 0 : 1);
