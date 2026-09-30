// xl:note 嵌套解构：内层括号里的绑定名也要进解构名表
// xl:expect Let,Common
// 直系子单元里一个 `Common` 都没有（内层数组是 `JsonArray`、内层对象是 `JsonObject`），
// 不递归的话 `unpackArrayFieldNames` 是空串——`a` / `b` / `c` 三个绑定名整体丢失。
// 名字表的内容由 tests/parse/lossless.mjs 逐字对账，这条用例钉住「至少不抛异常、`Let` 成形」。
const [[a, b], [, c = 0]] = [[1, 2], [3]];
