// §6「end build 不对」：close 时取 End 的单元取错（零宽节点落点 / 尾随注释尾巴）。
// 覆盖组：D9 —— `throw` 无参数恢复出的零宽 Identifier 落点、type-tail 行注释之后不得把下一行续进类型。
// 来源：token-repros 与 statements/stmt-throw-no-argument-then-statement、types/type-tail-linecomment 的修复。
// 注意：`throw\n;` 与 `type T = A // c\n[];` 当前仍是剩余 diff（docs §6.3），**不写成活跃行**，
// 只放已 PASS 的边界对照；一行一个用例，行内 `\n` 由 ast-json.mjs 还原。

// ── D9 边界：throw 的语句在 `;` / 行注释处收口（End 不吞尾随注释） ──
throw e // c\n;
throw e; // c

// ── D9 边界：类型别名的 End 停在最后一个代码单元（行注释不进区间） ──
type T = A; // c
