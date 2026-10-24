// R1 最小复现 + 形态矩阵（诊断用，非门禁）。
//   node tests/statement-possible/r1-repro.mjs
// 对每个形态在 shell=true / shell=false 两条路径上各跑一次 Parse，
// 记录：是否抛错、异常文本、LastFileFallback、语句条数（AST 顶层 kind 序列）。
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const require = createRequire(import.meta.url);
const load = (relative) => require(path.join(root, "build/ts", relative));

const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
let route = null;
try {
  route = load("typescript/tokens/statements/statement-route-util.js").StatementRouteUtil;
} catch {
  route = null;
}

const FORMS = [
  ["R1-裸块", "let a = 1\n{ b; }"],
  ["let-空块", "let a = 1\n{}"],
  ["赋值-空块", "x = 1\n{}"],
  ["if-同行块", "let a = 1\nif (a) {}"],
  ["纯表达式-块", "a\n{}"],
  ["let-带声明块", "let a = 1\n{ let b = 2; }"],
  ["let-空语句-块", "let a = 1\n;\n{ b; }"],
  ["对照-同形分号", "let a = 1;\n{ b; }"],
  ["对照-函数表达式", "const f = function ()\n{ }"],
  ["对照-箭头块体", "const f = () =>\n{ }"],
  ["对照-块首", "{ b; }\nlet a = 1"],
  ["对照-类型字面量", "let a: {\n  x: number\n} = { x: 1 }"],
];

function describeError(error) {
  let message = "";
  for (let node = error; node; node = node.InnerException || node.innerException) {
    const text = node.Message || node.message;
    if (text) message = String(text);
  }
  return message.split("\n")[0] || "unknown error";
}

// AST 顶层语句：用 TsAst 的对拍口径太重，这里只数 XML 里的语句壳节点名。
function topKinds(shape) {
  if (shape === null || shape === undefined || typeof shape.ToXmlString !== "function") return null;
  const xml = shape.ToXmlString();
  const kinds = [];
  const re = /<([A-Za-z0-9_.]*Statement[A-Za-z0-9_.]*)[ >]/g;
  let match;
  while ((match = re.exec(xml)) !== null) kinds.push(match[1]);
  return kinds.length === 0 ? ["<none>"] : kinds;
}

function run(source, shell) {
  if (route !== null) route.EnableShellExpressions = shell;
  try {
    const shape = SourceFileRunner.Parse(source, "case.ts");
    return {
      ok: true,
      kinds: topKinds(shape),
      fallback: route === null ? null : route.LastFileFallback === true,
    };
  } catch (error) {
    return {
      ok: false,
      error: describeError(error),
      fallback: route === null ? null : route.LastFileFallback === true,
    };
  }
}

let failures = 0;
for (const [label, source] of FORMS) {
  const shellOn = run(source, true);
  const shellOff = run(source, false);
  const broken = !shellOn.ok || !shellOff.ok;
  if (broken) failures++;
  console.log(`${broken ? "BROKEN" : "ok    "} ${label}  ${JSON.stringify(source)}`);
  console.log(`   shell=true : ${shellOn.ok ? `kinds=${JSON.stringify(shellOn.kinds)}` : `THROW ${shellOn.error}`}  fallback=${shellOn.fallback}`);
  console.log(`   shell=false: ${shellOff.ok ? `kinds=${JSON.stringify(shellOff.kinds)}` : `THROW ${shellOff.error}`}  fallback=${shellOff.fallback}`);
}
console.log(`\nbroken forms: ${failures}/${FORMS.length}`);
