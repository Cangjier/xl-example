// xl:title 三格还没装的成员：`Number.prototype.toLocaleString`、`String.match` / `search`
// xl:round 689
// xl:judge stdout
// xl:want differ
// xl:why 三个成员**属性表里根本没有那一格**，调用一律报 `cannot call a non-closure value`：
//       ① `Number.prototype.toLocaleString`——JS 那一格带**区域设置**（`(1234.5).toLocaleString()`
//          Node 给 "1,234.5"：千分位分组），本仓没有区域设置那一层，所以**不是补一格就行的**
//          （补成 `toString` 会静默给 "1234.5" —— 比缺失更难查）；
//       ② `String.prototype.match` / `search`——它们的实参位要收**正则对象**
//          （`"a1b".match(/\d/)`），走的是 `Symbol.match` / `Symbol.search` 那条协议，
//          而本仓的 `RegExp` 整族还没做（台账里那 7 条同源）。
//       两者都不是「补一格名字」的事，原样登在这里。
// xl:end

console.log("num-locale", typeof (Number.prototype as any).toLocaleString);
console.log("str-match", typeof (String.prototype as any).match, typeof (String.prototype as any).search);
try {
  const r: any = "a1b".match("1");
  console.log("match", String(r));
} catch (e: any) {
  console.log("match", "ERR");
}
try {
  const at: any = "abc".search("b");
  console.log("search", String(at));
} catch (e: any) {
  console.log("search", "ERR");
}
