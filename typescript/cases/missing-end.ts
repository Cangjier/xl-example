// §6「缺少 end」：块体 / ModuleBlock 没有自己的终结候选，只能靠外层或 `;` 收口。
// 覆盖组：G2b 函数体 / 构造器体、G2c ModuleBlock 里的 `import =` / `export =`、I 的 `export as namespace`。
// 来源：token-repros/end-modules-c1-c2-c3-g2c.ts（已并入）；一行一个用例，
// 行内 `\n` 由 ast-json.mjs 还原成真实换行。§5 口径：base 在前，重复形/trivia 变体在后。

// ── G2c：import = / export =（无分号到块尾） ──
import A = A.B;
namespace N1 { import A = B.C }
namespace N2 { import x = require("m") }
namespace N3 { const a = 1; export = a }

// ── G2c：declare module 体里的无分号成员（多成员 = 重复形） ──
declare module "x" {\n  export function f(): void\n  const y: number\n  export default y\n}
declare module "*.css" {\n  const content: string\n  export default content\n}
declare global { interface Window { x: A } }

// ── I：export as namespace（无分号收在文件末尾） ──
declare namespace A {}\nexport as namespace A
export as namespace JSON

// ── G2b：函数体 / 构造器体本身就是收口单元 ──
function f() {}
class C { constructor() { } }
