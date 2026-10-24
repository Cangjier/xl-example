// R2/R3 有/无修复逐条对照（诊断用，非门禁）。
//   node tests/statement-possible/r2-counterfactual.mjs
//
// R3 修复工具缺陷：原文件是 `.mjs` 却用 CJS 的 `require` → 直接 ReferenceError，从未跑出读数。
// 现在改成 ESM（`createRequire` 只用来加载 build/ts 的 CJS 产物），路径全部按本文件定位，
// 不再依赖 process.cwd()。
//
// 中和方式：`ExpressionStatementPossibleShape.ExpectsBodyBefore = () => true`，
// 于是 R2 的「换行 + `{` 块起点 + 前缀不等体」判据与 R3 的 if 体 / export 收口同时失效
//（= 精确回到 R2 之前的行为）。注意：R3 的**对象字面量收尾**判据不经过 ExpectsBodyBefore，
// 所以 r3-object-* 的 WITHOUT 列不会变红 —— 表尾说明了这一点。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createAstCore, cjAst } from "../../typescript/cases/ast-compare.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const require = createRequire(import.meta.url);
const ts = require(path.join(root, "node_modules", "typescript"));
const { tsAst } = createAstCore(ts);
const load = (relative) => require(path.join(root, "build/ts", relative));

const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
const { ExpressionStatementPossibleShape } = load(
  "typescript/tokens/statements/expression-statement-possible-shape.js",
);
let route = null;
try {
  route = load("typescript/tokens/statements/statement-route-util.js").StatementRouteUtil;
} catch {
  route = null;
}
if (route !== null) route.EnableShellExpressions = true;

const strip = (node) => {
  const kids = node.children || [];
  if (kids.length > 0 && kids[kids.length - 1].kind === "EndOfFileToken") kids.pop();
  return node;
};

function verdict(source) {
  try {
    const cj = cjAst(SourceFileRunner.Parse(source, "case.ts"));
    const withTs = strip(tsAst(ts.createSourceFile("case.ts", source, ts.ScriptTarget.Latest, true)));
    return JSON.stringify(cj) === JSON.stringify(withTs) ? "MATCH" : "DIFF";
  } catch (error) {
    let message = "";
    for (let node = error; node; node = node.InnerException || node.innerException) {
      const text = node.Message || node.message;
      if (text) message = String(text);
    }
    return "THROW " + (message.split("\n")[0] || "unknown");
  }
}

const doc = JSON.parse(fs.readFileSync(path.join(here, "r1-cases.json"), "utf8"));
const cases = doc.groups["r1-asi"].cases.map((item) => [item.name, item.source]);
const orig = ExpressionStatementPossibleShape.ExpectsBodyBefore;

console.log("name".padEnd(30) + "WITH-FIX       WITHOUT-FIX(neutralized)");
let changed = 0;
for (const [name, source] of cases) {
  ExpressionStatementPossibleShape.ExpectsBodyBefore = orig;
  const withFix = verdict(source);
  ExpressionStatementPossibleShape.ExpectsBodyBefore = () => true; // R2 之前的精确行为
  const withoutFix = verdict(source);
  ExpressionStatementPossibleShape.ExpectsBodyBefore = orig;
  if (withFix !== withoutFix) changed++;
  console.log(name.padEnd(30) + withFix.padEnd(16) + withoutFix);
}
console.log(`\n[counterfactual] cases=${cases.length} changed-by-fix=${changed}`);
console.log("[counterfactual] WITHOUT 列对 r3-object-* 无效：那条判据不经过 ExpectsBodyBefore");
