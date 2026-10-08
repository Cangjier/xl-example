// xl:expect Let
// xl:note TypeScript 里 `$` 是标识符字符（`const $x = 1` 应当成形）。
// 现状：`$` 在符号表里（它同时是 `$"…"` 内插的前缀），`$x` 被拆成 SymbolToken + Identifier，Let 不成形。
// 修它要同时照顾内插前缀的回退逻辑，故先登记为缺口。
const $x = 1
