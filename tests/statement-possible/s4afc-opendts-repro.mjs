// s4af-C C2 归类工装：把打开态 4 条 real-dts 差异的**最小复现**固化成可重复读数。
//
// 每个用例在「默认态」与「打开态」各解析一次（同一进程内切换开关，逐例新建根形状），
// 打印 ts 顶层语句（kind+pos）与 cj 顶层形状（kind+pos）：
//   - A 族（EOF 闭合 {} 收口上界）：`export { … }` 是文件最后一条语句、以 `}` 收尾，
//     打开态被拆成 Common("export") + Block({…})；
//   - B 族（闭合 {} 后无边界）：这里给的是 `}` 后还有代码的对照，用来证明「纯 B 形状不复现」；
//   - 独立缺陷：`declare function …`（无 `;`，ASI 收口）之后的声明语句在打开态被吞并。
//
// 用法：node tests/statement-possible/s4afc-opendts-repro.mjs
// 退出码：0 表示本脚本跑完（它是对照读数，不做门禁）。

import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const ts = require(path.join(root, "node_modules", "typescript"));
const { StatementRouteUtil } = require(path.join(root, "build", "ts", "typescript", "tokens", "statements", "statement-route-util.js"));
const { SourceFileRunner } = require(path.join(root, "build", "ts", "typescript", "run", "source-file-runner.js"));

const CASES = [
  // A 族：export 声明是最后一条语句，末尾 `}` 就是文件末尾（三条 undici 声明的共同形状）。
  ["A/EOF 无分号单条", "export { A, B }"],
  ["A/EOF 无分号 + 换行", "export { A, B }\n"],
  ["A/EOF 前面还有别的语句", "const a = 1;\nexport { A, B }\n"],
  // 对照：`}` 之后还有代码时（纯 B 形状）能正常收口——证明 B 的最小形状本身不失败。
  ["对照/} 后还有语句", "export { A, B }\nexport { C }\nconst x = 1;\n"],
  ["对照/} 后 export default", "export { A, B }\nexport default X\n"],
  ["对照/} 后调语句", "export { A, B }\nfoo();\n"],
  // 独立缺陷：无分号的 ambient 函数声明（ASI 收口）之后的声明语句被吞并。
  ["独立/declare fn(无;)+export{}", "declare function f(): void\nexport { A, B }\nexport default X\n"],
  ["独立/declare fn(有;)+export{}", "declare function f(): void;\nexport { A, B }\nexport default X\n"],
  ["独立/declare fn(无;)+const", "declare function f(): void\nconst x = 1;\nexport default X\n"],
  ["独立/declare fn(无;)+import", "declare function f(): void\nimport y from \"m\";\nexport default X\n"],
];

function parseWith(text, shell) {
  StatementRouteUtil.EnableDeclarationShell = shell;
  const shape = ts.createSourceFile("a.ts", text, ts.ScriptTarget.Latest, true);
  const their = shape.statements.map((s) => `${ts.SyntaxKind[s.kind]}[${s.pos},${s.end}]`);
  let crashed = null;
  let our = null;
  try {
    const rootShape = SourceFileRunner.Parse(text, "a.ts");
    our = rootShape.Data.map((s) => {
      const range = s.SourceRange || {};
      return `${s.constructor.name.replace("Shape", "")}[${s.Pos},${range.EndIndex}]`;
    });
  } catch (error) {
    crashed = String(error.Message || error.message || "unknown").split("\n")[0];
  }
  return { their, our, crashed };
}

console.log("s4af-C C2 最小复现：默认态（EnableDeclarationShell=false） vs 打开态（=true）");
for (const [name, text] of CASES) {
  const off = parseWith(text, false);
  const on = parseWith(text, true);
  console.log(`\n=== ${name}  ${JSON.stringify(text)}`);
  console.log("  ts:", off.their.join(" "));
  console.log("  默认态:", off.crashed ? "CRASH " + off.crashed : off.our.join(" "));
  console.log("  打开态:", on.crashed ? "CRASH " + on.crashed : on.our.join(" "));
}
process.exit(0);
