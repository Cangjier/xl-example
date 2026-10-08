// xl:title 名字逐个取一次：Symbol 的静态成员（第 690 轮只剩 `prototype` 一格）
// xl:round 678
// xl:judge stdout
// xl:want differ
// xl:why 第 678 轮登记时缺九格，第 690 轮补掉了八格：七个知名符号
//       （`isConcatSpreadable` / `unscopables` / `match` / `replace` / `search` /
//       `split` / `matchAll` 与 `length`——后两个在 `length` 那一行量的是 `number`）。
//       只剩 `Symbol.prototype`：它是**符号包装对象的原型**，本仓还没有那一族
//       （`Object(sym)` 至今响亮地抛），所以这一格不是「漏挂一个属性」能收的。
// xl:end
const b: any = Symbol;
let v = "";
v = "no";
try {
  v = String(typeof b["isConcatSpreadable"]);
} catch (err) {
}
console.log(typeof b, "isConcatSpreadable", v);
v = "no";
try {
  v = String(typeof b["length"]);
} catch (err) {
}
console.log(typeof b, "length", v);
v = "no";
try {
  v = String(typeof b["match"]);
} catch (err) {
}
console.log(typeof b, "match", v);
v = "no";
try {
  v = String(typeof b["matchAll"]);
} catch (err) {
}
console.log(typeof b, "matchAll", v);
v = "no";
try {
  v = String(typeof b["prototype"]);
} catch (err) {
}
console.log(typeof b, "prototype", v);
v = "no";
try {
  v = String(typeof b["replace"]);
} catch (err) {
}
console.log(typeof b, "replace", v);
v = "no";
try {
  v = String(typeof b["search"]);
} catch (err) {
}
console.log(typeof b, "search", v);
v = "no";
try {
  v = String(typeof b["split"]);
} catch (err) {
}
console.log(typeof b, "split", v);
v = "no";
try {
  v = String(typeof b["unscopables"]);
} catch (err) {
}
console.log(typeof b, "unscopables", v);
console.log("缺", 9, "个名字");
