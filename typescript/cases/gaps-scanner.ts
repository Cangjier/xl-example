// xl:note scanner/EOF 第二轮（task-79）修复的守卫：每条都是 token 语料对应缺口的单行化复现。
// 一行一个用例；行内 \n 由 ast-json.mjs 还原成真实换行。
// 覆盖：statement-scanner 的换行 ASI 收口（长链 / 类型注解跨行 / 行首 `;`）、被标声明的声明体换行、
// 孤立 `declare`/`abstract`（尾部 `;` 归语句）、`abstract` ⏎ `class` 两条语句、import 换行后 `export default`、
// ambient 模块体里的无分号 import 声明。
let total = 0\nfor (let i = 0; i < xs.length; i++) { total += xs[i] }
declare const o: { m: (...args: any[]) => any }\no.m()
lbl: while\n(a) { break lbl; }
iface: interface I\n{ m(): void }
en: enum E\n{ A }
abstract\nclass A {}
declare module "a" {\n  import { B } from "b"\n}

do x++\nwhile (x < 4);\nfoo();
do f()\nwhile (c);\ndo { x++; } while (x < 5);
