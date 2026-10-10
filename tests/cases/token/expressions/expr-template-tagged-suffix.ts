// xl:note 标签模板后面跟着后缀：`tag`abc`.length`（第 176 轮 · 投影 0c 支）。
// 第 947 轮（二）把 0c 的 `kids[1]` 放宽成「**找出那一格装着模板的 `PropertyAccess`**」，
// 并把点号补进后缀链的词表——于是这两档也归位：
//   · 注释把接收者拆平的那几档（`o/*c*/.tag`t`.b` 的产物是
//     `[Identifier(o), ., Identifier(tag), PropertyAccess(String, ., b)]`，`kids[1]` 是点号）
//   · 「点号 + 模板 + 后缀」（`o.tag`t`.b` / `new A.B`t`.c`）
// xl:expect String,PropertyAccess,Method
const a = tag`abc`.length;
const b = tag`a${x}b`[0];
const c = obj.tag`abc`.trim();
const d = (cond ? one : two)`abc`.length;
const e = o/*c*/.tag`abc`.length;
const f = o.
tag`abc`.length;
const g = new A.B`abc`.c;
