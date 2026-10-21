// end / import·export 收口：挂载壳的两种「无分号」边界——EOF（尾随 trivia 不算 End）与 ASI（换行后接新语句）。
// 一行一个用例；行内的 \n 由 ast-json.mjs 还原成真实换行（多行用例也逐行对齐）。
// 对照：带 `;` 的声明是 Done 路径，块末尾列几条件为回归。

// ===== A 组：EOF，无分号 + 尾随 trivia（空白 / 换行 / 行注释 / 块注释）=====
// End 只能到最后一个代码单元；trivia 不进 End。
import x from "m" // c
import x from "m" /* c */
import x from "m"
import x from "m"\n
import x from "m" \n
import x from "m" /* a\nb */
import "m" // c
import type { T } from "m" // c
import x, { y } from "m" // c
import * as ns from "m" // c
import x from "m" with { type: "json" } // c
export { a } from "m" // c
export * from "m" // c
export * as ns from "m" // c
export type { T } from "m" // c
export { a } // c
export { a } from "m"\n

// ===== B 组：无分号 + 换行后接下一语句（ASI）=====
// 壳在「下一条语句第一个代码单元」处收口：import 不再吞掉下一条（否则 Close 白名单抛错），export 不再并成一条。
import x from "m"\nimport y from "n"
import x from "m"\nclass C {}
import x from "m"\na;
import x from "m"\n\nimport y from "n"
import x from "m"\nimport y from "n"\na;
import x from "m"\n// c\nimport y from "n"
import x from "m" // c\nimport y from "n"
import x from "m"// c\nimport y from "n"
import x from "m" /* c */\nimport y from "n"
import x from "m" /* c */\nexport { a };
import { a } from "m"\nexport { b } from "n"
export { a } from "m"\nexport { b } from "n"
export * from "m"\nexport * from "n"
export { a } from "m"\nexport * from "n"
export { a } from "m" /* c */\nexport { b } from "n"
export { a } from "m"\nclass C {}
export { a }\na;

// ===== 对照：换行后的单元仍属于同一条声明（不是 ASI 边界）=====
// 收口判据＝「声明结构已完整（模块说明符 / 属性括号 / 导出子句 `}`）」×「下一行不是延续关键字」。
import x\nfrom "m";
import { a }\nfrom "m";
import type\n{ T } from "m";
import defer\n* as ns from "m";
import x from "m" with\n{ type: "json" };
import x from "m" with\n{ type: "json" }\nimport y from "n"
export { a }\nfrom "m";
export *\nfrom "m";

// ===== 对照：带 `;` 的声明走 Done 路径（本轮改动不得影响它们）=====
import x from "m";\nimport y from "n";
export { a };\nexport { b } from "n";
import x from "m"; // c
export { a } from "m"; // c
