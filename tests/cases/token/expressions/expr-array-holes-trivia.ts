// xl:note 数组的洞（`OmittedExpression`）是**零宽**节点，位置是「**上一个逗号**之后那一格」
//（第 933 轮收掉）：`[1, , 2]` 的两个洞在 TS 那边是 `[13,13)` 与 `[15,15)`；
// 元素与逗号之间夹一条注释 / 一个换行时，原来那句 `lastEnd + 1`（上一个**元素**的终点 + 1）
// 会停在注释开头 ⇒ 差一格（漂 1 + 多 1）；头一个洞 `[, 1]` 的位置是**紧跟 `[` 之后那一格**
//（`lastEnd` 自己，不是 `lastEnd + 1`）。
// 两处实现（`tokens/json/array-literal.xl.md` 与 `print-ast-common.xl.md` 的 `projectEachIn`）
// 同一份口径一起改。
const a = [1, , 2];
const b = [1/*c*/, , 2];
const c = [1,/*c*/, 2];
const d = [1,
, 2];
const e = [, 1];
const f = [1, , , 2];
const g = [1, ,];
